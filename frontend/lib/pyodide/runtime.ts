"use client";

const PYODIDE_CDN = "https://cdn.jsdelivr.net/pyodide/v0.27.0/full/";

// Load Pyodide by injecting a script tag (NOT via npm — that breaks webpack)
// CDN script injects loadPyodide onto globalThis
declare const globalThis: typeof global & {
  loadPyodide?: (options: { indexURL: string }) => Promise<PyodideInstance>;
};

let cdnLoadPromise: Promise<void> | null = null;
async function loadPyodideFromCDN(): Promise<void> {
  if (globalThis.loadPyodide) return;
  if (cdnLoadPromise) return cdnLoadPromise;
  cdnLoadPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `${PYODIDE_CDN}pyodide.js`;
    script.onload = () => resolve();
    script.onerror = () => {
      cdnLoadPromise = null;
      reject(new Error("Failed to load Pyodide script"));
    };
    document.head.appendChild(script);
  });
  return cdnLoadPromise;
}

// Pyodide doesn't ship TS types — use a minimal interface
interface PyodideResult {
  toJs: (options?: { dict_converter?: typeof Object.fromEntries }) => unknown[];
}

interface PyodideInstance {
  runPythonAsync: (code: string) => Promise<PyodideResult>;
  loadPackage: (packages: string[]) => Promise<void>;
  FS: {
    writeFile: (path: string, data: Uint8Array) => void;
    mkdir: (path: string, mode?: number) => void;
  };
}

let pyodideInstance: PyodideInstance | null = null;
let initPromise: Promise<PyodideInstance> | null = null;

export async function initPyodide(): Promise<PyodideInstance> {
  if (pyodideInstance) return pyodideInstance;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    await loadPyodideFromCDN();

    const pyodide = await globalThis.loadPyodide!({
      indexURL: PYODIDE_CDN,
    });

    // Load data science packages using loadPackage (faster than micropip
    // for packages that have pre-built Pyodide wheels)
    await pyodide.loadPackage(["micropip", "numpy", "pandas", "matplotlib"]);

    // Configure matplotlib to use non-interactive Agg backend
    await pyodide.runPythonAsync(`
import matplotlib
import warnings
warnings.filterwarnings('ignore', category=UserWarning, module='matplotlib')
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import sys
import io
import os

# Set working directory so pd.read_csv("file.csv") finds files
os.makedirs('/home/pyodide', exist_ok=True)
os.chdir('/home/pyodide')

# Make plt.show() a no-op that doesn't warn
plt.show = lambda *args, **kwargs: None

# Redirect stdout/stderr for capture
class CaptureIO(io.StringIO):
    pass

_stdout_buffer = CaptureIO()
_stderr_buffer = CaptureIO()
`);

    pyodideInstance = pyodide;
    return pyodide;
  })().catch((err) => {
    // Allow retry on failure
    initPromise = null;
    throw err;
  });

  return initPromise;
}

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  plots: string[]; // base64-encoded PNG data URLs
  error: string | null;
}

export async function runPython(code: string): Promise<ExecutionResult> {
  const pyodide = await initPyodide();

  const TIMEOUT_MS = 30_000;
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(
      () => reject(new Error("Execution timed out (30s)")),
      TIMEOUT_MS,
    ),
  );

  const executionPromise = (async (): Promise<ExecutionResult> => {
    // Wrap the user code to capture stdout/stderr and collect plots
    const wrappedCode = `
import sys
import io
import base64
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

_stdout_capture = io.StringIO()
_stderr_capture = io.StringIO()
_plots = []

_old_stdout = sys.stdout
_old_stderr = sys.stderr
sys.stdout = _stdout_capture
sys.stderr = _stderr_capture

try:
    exec(compile(${JSON.stringify(code)}, '<notebook>', 'exec'), globals())
except Exception as _exec_err:
    import traceback
    sys.stderr.write(traceback.format_exc())
finally:
    sys.stdout = _old_stdout
    sys.stderr = _old_stderr
    # Collect any open figures as base64 PNGs
    for _fig_num in plt.get_fignums():
        _fig = plt.figure(_fig_num)
        _buf = io.BytesIO()
        _fig.savefig(_buf, format='png', bbox_inches='tight', dpi=96)
        _buf.seek(0)
        _plots.append('data:image/png;base64,' + base64.b64encode(_buf.read()).decode('utf-8'))
        plt.close(_fig)

[_stdout_capture.getvalue(), _stderr_capture.getvalue(), _plots]
`;

    const result: ExecutionResult = {
      stdout: "",
      stderr: "",
      plots: [],
      error: null,
    };

    try {
      const pyResult = await pyodide.runPythonAsync(wrappedCode);
      const jsResult = pyResult.toJs({
        dict_converter: Object.fromEntries,
      });

      result.stdout = String(jsResult[0] ?? "");
      result.stderr = String(jsResult[1] ?? "");
      result.plots = Array.isArray(jsResult[2])
        ? ([...jsResult[2]] as string[])
        : [];

      if (result.stderr) {
        result.error = result.stderr;
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      result.error = errMsg;
      result.stderr = errMsg;
    }

    return result;
  })();

  try {
    return await Promise.race([executionPromise, timeoutPromise]);
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    return {
      stdout: "",
      stderr: errMsg,
      plots: [],
      error: errMsg,
    };
  }
}

export async function loadDatasetFile(
  name: string,
  content: ArrayBuffer | string,
): Promise<void> {
  const pyodide = await initPyodide();

  // Sanitize filename to prevent path traversal
  const safeName = name.replace(/[/\\]/g, "_");

  const uint8 =
    typeof content === "string"
      ? new TextEncoder().encode(content)
      : new Uint8Array(content);

  // Write to Pyodide's working directory (/home/pyodide) so
  // pd.read_csv("filename.csv") works without a full path
  try {
    pyodide.FS.mkdir("/home/pyodide", 0o777);
  } catch {
    // already exists
  }
  pyodide.FS.writeFile(`/home/pyodide/${safeName}`, uint8);

  // Also write to /data/ for explicit paths
  try {
    pyodide.FS.mkdir("/data", 0o777);
  } catch {
    // already exists
  }
  pyodide.FS.writeFile(`/data/${safeName}`, uint8);
}

export async function resetNamespace(): Promise<void> {
  if (!pyodideInstance) return;

  // Clear all user-defined variables while keeping builtins and imports intact
  await pyodideInstance.runPythonAsync(`
import sys

_builtins_keys = set(dir(__builtins__))
_safe_modules = {'sys', 'io', 'base64', 'traceback', 'matplotlib', 'numpy', 'pandas', 'micropip'}
_to_delete = [
    k for k in list(globals().keys())
    if not k.startswith('_') and k not in _builtins_keys and k not in _safe_modules
]
for _k in _to_delete:
    try:
        del globals()[_k]
    except Exception:
        pass
`);
}

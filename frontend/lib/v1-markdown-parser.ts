/**
 * Parser for v1 (custom) markdown format exported from Odyssey
 * 
 * Location: lib/v1-markdown-parser.ts
 * 
 * This handles the HTML-based custom block structure:
 * - Generic Droplet
 * - Callout Droplet
 * - Expandable Droplet
 * - Quiz
 * - Open-Ended Quiz
 * - Video
 */

export type V1Metadata = {
  type?: string;
  focusArea?: string;
  tags?: string[];
  authors?: string[];
  description?: string;
  overview?: string;
  learningObjectives?: string[];
  nextSteps?: Array<{ label: string; url: string }>;
  prerequisites?: string[];
  postrequisites?: string[];
};

export type V1Block = {
  __component: string;
  content?: string;
  title?: string;
  color?: string;
  type?: string;
  url?: string;
  questions?: any[];
};

export type V1Lesson = {
  name: string;
  blocks: V1Block[];
};

/**
 * Extract metadata from v1 markdown format
 */
export function extractV1Metadata(markdown: string): V1Metadata {
  const metadata: V1Metadata = {};
  
  // Find the metadata section
  const metadataMatch = markdown.match(/## \*\*Metadata\*\*\s*\n([\s\S]*?)(?=\n## \*\*Lessons\*\*|\n##[^*]|$)/);
  
  if (!metadataMatch) {
    return metadata;
  }
  
  const metadataSection = metadataMatch[1];
  
  // Extract Type
  const typeMatch = metadataSection.match(/Type:\s*(.+)/i);
  if (typeMatch) {
    metadata.type = typeMatch[1].trim();
  }
  
  // Extract Focus Area
  const focusMatch = metadataSection.match(/Focus Area:\s*(.+)/i);
  if (focusMatch) {
    metadata.focusArea = focusMatch[1].trim();
  }
  
  // Extract Tags
  const tagsMatch = metadataSection.match(/### Tags\s*\n((?:\*\s*.+\n?)+)/);
  if (tagsMatch) {
    metadata.tags = tagsMatch[1]
      .split('\n')
      .map(line => line.replace(/^\*\s*/, '').trim())
      .filter(Boolean);
  }
  
  // Extract Authors
  const authorsMatch = metadataSection.match(/### Authors\s*\n((?:\*\s*.+\n?)+)/);
  if (authorsMatch) {
    metadata.authors = authorsMatch[1]
      .split('\n')
      .map(line => line.replace(/^\*\s*/, '').trim())
      .filter(Boolean);
  }
  
  // Extract Description (HTML)
  const descMatch = metadataSection.match(/### Description\s*\n<p>([\s\S]+?)<\/p>/);
  if (descMatch) {
    metadata.description = descMatch[1].trim();
  }
  
  // Extract Overview (HTML)
  const overviewMatch = metadataSection.match(/### Overview\s*\n<p>([\s\S]+?)<\/p>/);
  if (overviewMatch) {
    metadata.overview = overviewMatch[1].trim();
  }
  
  // Extract Learning Objectives
  const objMatch = metadataSection.match(/### Learning Objectives\s*\n((?:\*\s*.+\n?)+)/);
  if (objMatch) {
    metadata.learningObjectives = objMatch[1]
      .split('\n')
      .map(line => line.replace(/^\*\s*/, '').trim())
      .filter(Boolean);
  }
  
  // Extract Next Steps
  const nextStepsMatch = metadataSection.match(/### Next Steps\s*\n\*\s*(.+?)\s+linked to:\s+(.+)/);
  if (nextStepsMatch) {
    metadata.nextSteps = [{
      label: nextStepsMatch[1].trim(),
      url: nextStepsMatch[2].trim(),
    }];
  }
  
  // Extract Prerequisites
  const prereqMatch = metadataSection.match(/### Prerequisites\s*\n\*\s*(.+)/);
  if (prereqMatch) {
    const prereqValue = prereqMatch[1].trim();
    if (prereqValue.toLowerCase() !== 'no prerequisites') {
      metadata.prerequisites = [prereqValue];
    }
  }
  
  // Extract Postrequisites
  const postreqMatch = metadataSection.match(/### Postrequisites\s*\n(.+)/);
  if (postreqMatch) {
    const postreqValue = postreqMatch[1].trim();
    if (postreqValue.toLowerCase() !== 'no postreqs') {
      metadata.postrequisites = [postreqValue];
    }
  }
  
  return metadata;
}

/**
 * Parse a single v1 block
 */
function parseV1Block(blockText: string): V1Block | null {
  const lines = blockText.trim().split('\n');
  if (lines.length === 0) return null;
  
  const blockType = lines[0].replace(/^####\s*/, '').trim();
  
  // Generic Droplet
  if (blockType === "Generic Droplet") {
    const content = lines.slice(2).join('\n').trim();
    return {
      __component: "droplets.generic",
      content,
    };
  }
  
  // Callout Droplet
  if (blockType === "Callout Droplet") {
    let color = "";
    let type = "info";
    let content = "";
    
    for (let i = 2; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith("Color:")) {
        color = line.replace(/^Color:\s*/, '').trim();
      } else if (line.startsWith("Type:")) {
        type = line.replace(/^Type:\s*/, '').trim();
      } else if (line.trim()) {
        content += (content ? '\n' : '') + line;
      }
    }
    
    // Convert plain text content to the expected nested structure
    const contentStructure = [
      {
        type: "paragraph",
        children: [
          { type: "text", text: content }
        ]
      }
    ];
    
    return {
      __component: "droplets.callout",
      content: contentStructure as any,
      color,
      type,
    };
  }
  
  // Expandable Droplet
  if (blockType === "Expandable Droplet") {
    const titleLine = lines.find(l => l.startsWith('#####'));
    const title = titleLine ? titleLine.replace(/^#####\s*/, '').trim() : "";
    const contentStart = titleLine ? lines.indexOf(titleLine) + 1 : 2;
    const content = lines.slice(contentStart).join('\n').trim();
    
    return {
      __component: "droplets.expandable",
      title,
      content,
    };
  }
  
  // Video
  if (blockType === "Video") {
    const urlLine = lines.find(l => l.startsWith("Video Link:"));
    const url = urlLine ? urlLine.replace(/^Video Link:\s*/, '').trim() : "";
    
    return {
      __component: "droplets.video",
      url,
    };
  }
  
  // Quiz (Multiple Choice)
  if (blockType === "Quiz") {
    const questions: any[] = [];
    let currentQuestion: any = null;
    
    for (let i = 2; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Question line starts with number
      if (/^\d+\.\s*<p>/.test(line)) {
        if (currentQuestion) {
          questions.push(currentQuestion);
        }
        
        const contentMatch = line.match(/<p>(.+?)<\/p>/);
        currentQuestion = {
          content: contentMatch ? contentMatch[1] : line.replace(/^\d+\.\s*/, ''),
          answerOptions: [],
        };
      }
      // Answer line
      else if (/^\d+\.\s*Answer:/.test(line) && currentQuestion) {
        const answerMatch = line.match(/Answer:\s*<p>(.+?)<\/p>\s*is\s*(correct|incorrect)/);
        if (answerMatch) {
          currentQuestion.answerOptions.push({
            content: answerMatch[1],
            isCorrect: answerMatch[2] === 'correct',
          });
        }
      }
    }
    
    if (currentQuestion) {
      questions.push(currentQuestion);
    }
    
    return {
      __component: "droplets.quiz",
      questions,
    };
  }
  
  // Open-Ended Quiz
  if (blockType === "Open-Ended Quiz") {
    const questions: any[] = [];
    
    for (let i = 2; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (/^\d+\.\s*<p>/.test(line)) {
        const contentMatch = line.match(/<p>(.+?)<\/p>/);
        const answerMatch = lines[i + 1]?.match(/\*\s*Answer:\s*(.+)/);
        
        if (contentMatch && answerMatch) {
          questions.push({
            content: contentMatch[1],
            correctAnswer: answerMatch[1].trim(),
          });
        }
      }
    }
    
    return {
      __component: "droplets.open-ended-quiz",
      questions,
    };
  }
  
  return null;
}

/**
 * Parse lessons from v1 markdown format
 */
export function parseV1Lessons(markdown: string): V1Lesson[] {
  const lessons: V1Lesson[] = [];
  
  // Find the lessons section
  const lessonsMatch = markdown.match(/## \*\*Lessons\*\*\s*\n([\s\S]+)/);
  if (!lessonsMatch) {
    return lessons;
  }
  
  const lessonsSection = lessonsMatch[1];
  
  // Split by H3 headings (lesson names)
  const lessonSplits = lessonsSection.split(/(?=^### )/m);
  
  for (const lessonText of lessonSplits) {
    if (!lessonText.trim()) continue;
    
    const lines = lessonText.split('\n');
    const lessonNameLine = lines[0];
    
    if (!lessonNameLine.startsWith('###')) continue;
    
    const lessonName = lessonNameLine.replace(/^###\s*/, '').trim();
    
    // Split lesson content by #### (block markers)
    const blockSplits = lessonText.split(/(?=^#### )/m);
    const blocks: V1Block[] = [];
    
    for (let i = 1; i < blockSplits.length; i++) {
      const block = parseV1Block(blockSplits[i]);
      if (block) {
        blocks.push(block);
      }
    }
    
    if (blocks.length > 0) {
      lessons.push({
        name: lessonName,
        blocks,
      });
    }
  }
  
  return lessons;
}

/**
 * Main parser function for v1 markdown
 */
export function parseV1Markdown(markdown: string): {
  dropletName: string;
  metadata: V1Metadata;
  lessons: V1Lesson[];
} {
  // Extract droplet name from first H1
  const h1Match = markdown.match(/^#\s+(.+)$/m);
  const dropletName = h1Match ? h1Match[1].trim() : "Untitled Droplet";
  
  // Extract metadata
  const metadata = extractV1Metadata(markdown);
  
  // Parse lessons
  const lessons = parseV1Lessons(markdown);
  
  return {
    dropletName,
    metadata,
    lessons,
  };
}
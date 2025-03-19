module.exports = {
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' }, modules: false }], // modules: false for ESM
    '@babel/preset-react'
  ],
};
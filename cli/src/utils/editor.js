const { exec } = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');

class EditorLauncher {
  constructor() {
    this.editors = [
      { name: 'VS Code', command: 'code', check: 'code --version' },
      { name: 'Vim', command: 'vim', check: 'vim --version' },
      { name: 'Nano', command: 'nano', check: 'nano --version' },
      { name: 'Sublime Text', command: 'subl', check: 'subl --version' },
      { name: 'Atom', command: 'atom', check: 'atom --version' },
      { name: 'Emacs', command: 'emacs', check: 'emacs --version' }
    ];
    this.preferredEditor = this.loadPreferredEditor();
  }

  loadPreferredEditor() {
    const configPath = path.join(process.env.HOME, '.appsec-gym', 'config.json');
    if (fs.existsSync(configPath)) {
      try {
        const config = fs.readJsonSync(configPath);
        return config.editor;
      } catch (error) {
        // Invalid config, ignore
      }
    }
    // Check EDITOR environment variable
    return process.env.EDITOR || null;
  }

  savePreferredEditor(editor) {
    const configPath = path.join(process.env.HOME, '.appsec-gym', 'config.json');
    fs.ensureDirSync(path.dirname(configPath));
    const config = fs.existsSync(configPath) ? fs.readJsonSync(configPath) : {};
    config.editor = editor;
    fs.writeJsonSync(configPath, config, { spaces: 2 });
    this.preferredEditor = editor;
  }

  async detectAvailableEditors() {
    const available = [];
    
    for (const editor of this.editors) {
      const isAvailable = await new Promise(resolve => {
        exec(editor.check, (error) => {
          resolve(!error);
        });
      });
      
      if (isAvailable) {
        available.push(editor);
      }
    }
    
    return available;
  }

  async openFile(filePath, editor = null) {
    const editorToUse = editor || this.preferredEditor;
    
    if (!editorToUse) {
      // No editor configured, show instructions
      console.log(chalk.yellow('\n📝 Open this file in your editor:'));
      console.log(chalk.white(`   ${filePath}\n`));
      console.log(chalk.gray('Tip: Run "appsec-gym settings" to configure your preferred editor'));
      return false;
    }

    return new Promise((resolve) => {
      exec(`${editorToUse} "${filePath}"`, (error) => {
        if (error) {
          console.log(chalk.yellow('\n📝 Open this file in your editor:'));
          console.log(chalk.white(`   ${filePath}\n`));
          console.log(chalk.red(`Failed to open ${editorToUse}. Opening manually.`));
          resolve(false);
        } else {
          console.log(chalk.green(`✅ Opened in ${editorToUse}`));
          resolve(true);
        }
      });
    });
  }

  async openDirectory(dirPath, editor = null) {
    const editorToUse = editor || this.preferredEditor;
    
    if (!editorToUse) {
      console.log(chalk.yellow('\n📁 Challenge files are in:'));
      console.log(chalk.white(`   ${dirPath}\n`));
      return false;
    }

    // VS Code and some editors can open directories
    if (editorToUse === 'code' || editorToUse === 'subl' || editorToUse === 'atom') {
      return new Promise((resolve) => {
        exec(`${editorToUse} "${dirPath}"`, (error) => {
          if (error) {
            console.log(chalk.yellow('\n📁 Challenge files are in:'));
            console.log(chalk.white(`   ${dirPath}\n`));
            resolve(false);
          } else {
            console.log(chalk.green(`✅ Opened directory in ${editorToUse}`));
            resolve(true);
          }
        });
      });
    } else {
      // For terminal editors, just open the main file
      const mainFile = path.join(dirPath, 'vulnerable.js');
      if (fs.existsSync(mainFile)) {
        return this.openFile(mainFile, editorToUse);
      }
    }
  }

  getOpenCommand(filePath) {
    // Returns a command string the user can copy/paste
    if (this.preferredEditor) {
      return `${this.preferredEditor} "${filePath}"`;
    }
    
    // Suggest VS Code as it's most common
    return `code "${filePath}"  # or use your preferred editor`;
  }
}

module.exports = EditorLauncher;
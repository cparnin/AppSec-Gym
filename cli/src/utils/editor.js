const { exec } = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');

class EditorLauncher {
  constructor() {
    this.editors = [
      { name: 'VS Code', command: 'code', check: 'code --version' },
      { name: 'Vim', command: 'vim', check: 'vim --version' }
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
        const checkCommand = process.platform === 'win32' 
          ? `where ${editor.command}` 
          : `which ${editor.command}`;
          
        exec(checkCommand, { timeout: 1000 }, (error) => {
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
    
    if (!editorToUse || editorToUse === 'manual') {
      // No editor configured, show instructions
      console.log(chalk.yellow('\n📝 Open this file in your editor:'));
      console.log(chalk.white(`   ${filePath}\n`));
      return false;
    }

    // Special handling for VS Code on Mac
    let command = editorToUse;
    if (editorToUse === 'code' && process.platform === 'darwin') {
      // Try common VS Code locations on Mac
      const vscodeLocations = [
        '/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code',
        '/usr/local/bin/code',
        'code'
      ];
      
      for (const loc of vscodeLocations) {
        const exists = await new Promise(resolve => {
          exec(`which "${loc}" 2>/dev/null || test -f "${loc}"`, (error) => {
            resolve(!error);
          });
        });
        if (exists) {
          command = loc;
          break;
        }
      }
    }

    return new Promise((resolve) => {
      // Use open command on Mac for better compatibility
      const openCommand = process.platform === 'darwin' && editorToUse === 'code'
        ? `open -a "Visual Studio Code" "${filePath}"`
        : `${command} "${filePath}"`;
        
      exec(openCommand, (error) => {
        if (error) {
          console.log(chalk.yellow('\n📝 Could not auto-open. Please open this file manually:'));
          console.log(chalk.white(`   ${filePath}\n`));
          if (editorToUse === 'code') {
            console.log(chalk.gray('Tip: Make sure VS Code command line tools are installed'));
            console.log(chalk.gray('     In VS Code: Cmd+Shift+P → "Shell Command: Install \'code\' command"'));
          }
          resolve(false);
        } else {
          console.log(chalk.green(`\n✅ Opened in ${editorToUse}`));
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
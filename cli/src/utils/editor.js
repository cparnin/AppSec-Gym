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
      { name: 'TextEdit (Mac)', command: 'open -e', check: 'which open' }
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
      console.log(chalk.cyan('\n📁 Challenge file created:'));
      console.log(chalk.white(`   ${filePath}\n`));
      console.log(chalk.yellow('Please open this file in your preferred editor to start fixing the vulnerability.'));
      return false;
    }

    return new Promise((resolve) => {
      let openCommand;

      if (editorToUse === 'code') {
        // Try VS Code with different approaches
        if (process.platform === 'darwin') {
          openCommand = `open -a "Visual Studio Code" "${filePath}" 2>/dev/null || code "${filePath}" 2>/dev/null`;
        } else {
          openCommand = `code "${filePath}"`;
        }
      } else if (editorToUse === 'vim') {
        // Open vim in a new terminal window on macOS
        if (process.platform === 'darwin') {
          openCommand = `osascript -e 'tell application "Terminal" to do script "vim \\"${filePath}\\""'`;
        } else {
          openCommand = `gnome-terminal -- vim "${filePath}" 2>/dev/null || xterm -e vim "${filePath}" 2>/dev/null || vim "${filePath}"`;
        }
      } else if (editorToUse === 'nano') {
        // Open nano in a new terminal window on macOS
        if (process.platform === 'darwin') {
          openCommand = `osascript -e 'tell application "Terminal" to do script "nano \\"${filePath}\\""'`;
        } else {
          openCommand = `gnome-terminal -- nano "${filePath}" 2>/dev/null || xterm -e nano "${filePath}" 2>/dev/null || nano "${filePath}"`;
        }
      } else if (editorToUse === 'open -e') {
        // TextEdit on Mac
        openCommand = `open -e "${filePath}"`;
      } else {
        // Generic editor command
        openCommand = `${editorToUse} "${filePath}"`;
      }

      exec(openCommand, (error) => {
        // Always show the file path for manual opening
        console.log(chalk.cyan('\n📁 Challenge file created:'));
        console.log(chalk.white(`   ${filePath}\n`));

        if (error) {
          console.log(chalk.yellow('Could not auto-open in editor. Please open manually.'));
          if (editorToUse === 'code') {
            console.log(chalk.gray('Tip: Make sure VS Code command line tools are installed'));
            console.log(chalk.gray('     In VS Code: Cmd+Shift+P → "Shell Command: Install \'code\' command"'));
          }
          console.log(chalk.gray(`Manual command: ${editorToUse} "${filePath}"`));
          resolve(false);
        } else {
          console.log(chalk.green(`✅ Also opened in ${editorToUse}`));
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
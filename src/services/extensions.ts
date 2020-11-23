import * as vscode from "vscode";
import { ExtensionId } from "../constants";
import * as fs from "fs-extra";
import { join } from "path";
import SettingsHelper from "../settingsHelper";
import Config from "./config";
import { promisify } from "util";
import * as childProcess from "child_process";
import { Logger } from "./logger";

const exec = promisify(childProcess.exec);

export class ExtensionInfo {
  public constructor(
    public id: string,
    public publisherId: string,
    public publisherName: string,
    public version: string,
    public name: string
  ) {}
}

class ExtensionHelper {
  public constructor(
    private context: vscode.ExtensionContext,
    private settings: SettingsHelper,
    private config: Config
  ) {}

  public getInstalled(): ExtensionInfo[] {
    const ignoredExtensions = this.config.getIgnoredExtensions();

    return (
      vscode.extensions.all
        .filter((ext) => !ext.packageJSON.isBuiltin)
        // ignore the current extension
        .filter((ext) => ext.id.toLowerCase() !== ExtensionId.toLowerCase())
        .filter(
          (ext) =>
            ignoredExtensions.filter(
              (iext) => iext.toLowerCase() === ext.id.toLowerCase()
            ).length === 0
        )
        .map(
          (ext) =>
            new ExtensionInfo(
              ext.packageJSON.uuid,
              ext.packageJSON.id,
              ext.packageJSON.publisher,
              ext.packageJSON.version,
              ext.packageJSON.name
            )
        )
    );
  }

  private async removeExtension(ext: ExtensionInfo, logger: Logger) {
    const name = `${ext.publisherName}.${ext.name}-${ext.version}`;
    const extPath = join(this.settings.ExtensionFolder, name);

    if (!(await fs.pathExists(extPath))) {
      console.log(
        `Profile Switcher: Extension ${name} didn't exist at path ${extPath}. Skipping removal.`
      );
      return;
    }

    try {
      const backupPath = join(this.context.globalStoragePath, name);
      if (!(await fs.pathExists(join(this.context.globalStoragePath, name)))) {
        await fs.copy(extPath, backupPath);
      }
      logger.appendLine(`Extension ${ext.name} has been backed up.`);
      logger.appendLine("");
    } catch (e) {
      console.log(`Profile Switcher: Error backing up extension ${name}`);
      console.log(e);
    }

    try {
      await fs.remove(extPath);
      logger.appendLine(`Extension ${ext.name} has been removed from VS Code.`);
      logger.appendLine("");
    } catch (e) {
      console.log(`Profile Switcher: Error removing extension ${name}`);
      console.log(e);
    }
  }

  public async removeExtensions(
    extensions: ExtensionInfo[],
    logger: Logger
  ): Promise<void> {
    const installedExtensions = this.getInstalled();

    const extensionsToRemove = installedExtensions.filter(
      (ext) => extensions.filter((e) => e.id === ext.id).length === 0
    );

    if (!(await fs.pathExists(this.context.globalStoragePath))) {
      await fs.mkdir(this.context.globalStoragePath);
    }

    logger.show();
    logger.appendLine(
      `Preparing to remove ${extensionsToRemove.length} extensions.`
    );
    logger.appendLine("");
    logger.appendLine("");

    const removes = extensionsToRemove.map((ext, i) => {
      logger.appendLine(
        `Removing ${ext.name} (${i + 1} of ${extensionsToRemove.length})`
      );
      logger.appendLine("");
      return this.removeExtension(ext, logger);
    });

    await Promise.all(removes);
  }

  private async installExtension(
    ext: ExtensionInfo,
    binaryFullPath: string,
    logger: Logger
  ) {
    const name = `${ext.publisherName}.${ext.name}-${ext.version}`;

    const backupPath = join(this.context.globalStoragePath, name);
    let installed = false;
    if (await fs.pathExists(backupPath)) {
      try {
        await fs.copy(backupPath, join(this.settings.ExtensionFolder, name));
        installed = true;
        logger.appendLine(`Extension ${ext.name} was restored from backup.`);
        logger.appendLine("");
      } catch (e) {
        console.log(
          `Profile Switcher: Error copying ${name} from backup path, will try to force install.`
        );
        console.log(e);
      }
    }

    if (!installed) {
      try {
        const cli = `${binaryFullPath} --install-extension ${ext.publisherId}`;
        const result = await exec(cli);
        logger.appendLine(result.stdout);
        logger.appendLine(
          `Extension ${name} was installed from the marketplace.`
        );
        logger.appendLine("");
      } catch (e) {
        logger.appendLine(`Extension ${name} failed to install.`);
        console.log(
          `Profile Switcher: Error installing ${name} from marketplace.`
        );
        console.log(e);
      }
    }
  }

  public async installExtensions(
    extensions: ExtensionInfo[],
    logger: Logger
  ): Promise<void> {
    const installedExtensions = this.getInstalled();

    const newExtensions = extensions.filter(
      (ext) => installedExtensions.filter((e) => e.id === ext.id).length === 0
    );

    if (!(await fs.pathExists(this.context.globalStoragePath))) {
      await fs.mkdir(this.context.globalStoragePath);
    }

    logger.show();
    logger.appendLine(
      `Preparing to install ${newExtensions.length} extensions.`
    );
    logger.appendLine("");
    logger.appendLine("");

    const codeBinary = this.settings.getCodeBinary();
    for (let i = 0; i < newExtensions.length; i++) {
      const ext = newExtensions[i];
      logger.appendLine(
        `Installing ${ext.name} (${i + 1} of ${newExtensions.length})`
      );
      logger.appendLine("");
      await this.installExtension(ext, codeBinary, logger);
    }
  }
}

export default ExtensionHelper;

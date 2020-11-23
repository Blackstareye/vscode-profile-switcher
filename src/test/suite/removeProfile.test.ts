/* eslint @typescript-eslint/no-explicit-any: "off" */
import { assert } from "chai";
import * as vscode from "vscode";
import {
  ConfigKey,
  ConfigProfilesKey,
  ConfigStorageKey,
  ConfigExtensionsKey
} from "../../constants";
import Config from "../../services/config";
import { ExtensionInfo } from "../../services/extensions";

suite("remove profile", () => {
  const expectedProfileName = "test1";
  const expectedProfileSettings = { foo: "bar" };
  const expectedExtensions = [
    new ExtensionInfo("abcd", "test.ext", "test", "1.0.0", "ext")
  ];

  setup(async () => {
    const config = vscode.workspace.getConfiguration(ConfigKey);

    await config.update(
      ConfigProfilesKey,
      [expectedProfileName],
      vscode.ConfigurationTarget.Global
    );
    await config.update(
      ConfigStorageKey,
      {
        [expectedProfileName]: expectedProfileSettings
      },
      vscode.ConfigurationTarget.Global
    );
    await config.update(
      ConfigExtensionsKey,
      {
        [expectedProfileName]: expectedExtensions
      },
      vscode.ConfigurationTarget.Global
    );
  });

  test("can remove profile name", async () => {
    const config = new Config();

    await config.removeProfile(expectedProfileName);

    const profiles = config.getProfiles();

    assert.notInclude(profiles, expectedProfileName);
  });

  test("can remove profile settings", async () => {
    const config = new Config();

    await config.removeProfileSettings(expectedProfileName);

    const settings = config.getProfileSettings(expectedProfileName);

    assert.isUndefined(settings);
  });

  test("can remove profile extensions", async () => {
    const config = new Config();

    await config.removeProfileExtensions(expectedProfileName);

    const extensions = config.getProfileExtensions(expectedProfileName);

    assert.isEmpty(extensions);
  });
});

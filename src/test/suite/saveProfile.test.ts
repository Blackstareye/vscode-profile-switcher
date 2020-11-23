/* eslint @typescript-eslint/no-explicit-any: "off" */
import { assert } from "chai";
import * as vscode from "vscode";
import {
  ConfigKey,
  ConfigProfilesKey,
  ConfigStorageKey,
  ConfigExtensionsKey,
  ConfigLiveShareProfileKey
} from "../../constants";
import Config from "../../services/config";
import { ExtensionInfo } from "../../services/extensions";

suite("save profile", () => {
  const expectedProfileName = "test1";
  teardown(async () => {
    const config = vscode.workspace.getConfiguration(ConfigKey);

    await config.update(
      ConfigProfilesKey,
      undefined,
      vscode.ConfigurationTarget.Global
    );
  });

  test("can save a profile name", async () => {
    const config = new Config();

    await config.addProfile(expectedProfileName);

    const profiles = config.getProfiles();
    assert.include(profiles, expectedProfileName);
  });

  suite("settings", () => {
    const expectedProfileSettings = { foo: "bar" };
    const expectedUpdatedProfileSettings = { foo: "baz", a: "b" };
    const profileSwitcherSettings = {
      [`${ConfigKey}.${ConfigProfilesKey}`]: [],
      [`${ConfigKey}.${ConfigStorageKey}`]: {},
      [`${ConfigKey}.${ConfigExtensionsKey}`]: {},
      [`${ConfigKey}.${ConfigExtensionsKey}`]: [],
      [`${ConfigKey}.${ConfigLiveShareProfileKey}`]: ""
    };

    teardown(async () => {
      const config = vscode.workspace.getConfiguration(ConfigKey);

      await config.update(
        ConfigStorageKey,
        undefined,
        vscode.ConfigurationTarget.Global
      );
    });

    test("can save profile settings", async () => {
      const config = new Config();

      await config.addProfileSettings(
        expectedProfileName,
        expectedProfileSettings
      );

      const settings = config.getProfileSettings(expectedProfileName);
      assert.deepEqual(settings, expectedProfileSettings);
    });

    test("can update existing profile", async () => {
      const config = new Config();

      await config.addProfileSettings(
        expectedProfileName,
        expectedProfileSettings
      );
      await config.addProfileSettings(
        expectedProfileName,
        expectedUpdatedProfileSettings
      );

      const settings = config.getProfileSettings(expectedProfileName);
      assert.deepEqual(settings, expectedUpdatedProfileSettings);
    });

    test("saving profile doesn't include profileSwitcher settings", async () => {
      const config = new Config();

      await config.addProfileSettings(
        expectedProfileName,
        Object.assign({}, expectedProfileSettings, profileSwitcherSettings)
      );

      const settings = config.getProfileSettings(expectedProfileName);
      Object.keys(profileSwitcherSettings).forEach(key =>
        assert.isUndefined(
          settings[key],
          `The key "${key}" should have been removed`
        )
      );
    });
  });

  suite("extensions", () => {
    const expectedExtensions = [
      new ExtensionInfo("abcd", "test.ext", "test", "1.0.0", "ext")
    ];
    const expectedUpdatedExtensions = [
      new ExtensionInfo("abcd", "test.ext", "test", "1.0.0", "ext"),
      new ExtensionInfo("12345", "test2.ext", "test2", "1.0.0", "ext")
    ];

    teardown(async () => {
      const config = vscode.workspace.getConfiguration(ConfigKey);

      await config.update(
        ConfigExtensionsKey,
        undefined,
        vscode.ConfigurationTarget.Global
      );
    });

    test("can save extensions", async () => {
      const config = new Config();

      await config.addExtensions(expectedProfileName, expectedExtensions);

      const settings = config.getProfileExtensions(expectedProfileName);
      assert.deepEqual(settings, expectedExtensions);
    });

    test("can update existing profile", async () => {
      const config = new Config();

      await config.addExtensions(expectedProfileName, expectedExtensions);
      await config.addExtensions(
        expectedProfileName,
        expectedUpdatedExtensions
      );

      const settings = config.getProfileExtensions(expectedProfileName);
      assert.deepEqual(settings, expectedUpdatedExtensions);
    });
  });
});

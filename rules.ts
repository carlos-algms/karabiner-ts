import fs from "fs";
import { KarabinerConfig, KarabinerRule } from "./types";
import {
  createHyperSubLayers,
  app,
  generateManyHoldModifier,
  createSubLayer,
} from "./utils";

const rules: KarabinerRule[] = [
  {
    description: "Hyper Key (⌃⌥⇧⌘)",
    manipulators: [
      {
        description: "quote -> Hyper Key",
        from: { key_code: "quote", modifiers: { optional: ["any"] } },
        to_if_alone: [{ key_code: "quote", halt: true }],
        to_delayed_action: { to_if_canceled: [{ key_code: "quote" }] },
        to_if_held_down: [{ set_variable: { name: "hyper", value: 1 } }],
        to_after_key_up: [{ set_variable: { name: "hyper", value: 0 } }],
        type: "basic",
      },
    ],
  },

  ...createHyperSubLayers({
    // o = "Open" applications
    o: {
      g: app("Google Chrome"),
      f: app("Firefox"),
      s: app("Slack"),
      t: app("Kitty"),
      e: app("Finder"),
      p: app("Spotify"),
    },
  }),

  ...createSubLayer("s", {
    h: { to: [{ key_code: "left_arrow" }] },
    j: { to: [{ key_code: "down_arrow" }] },
    k: { to: [{ key_code: "up_arrow" }] },
    l: { to: [{ key_code: "right_arrow" }] },
  }),

  {
    description: "Home Row Mods",
    manipulators: [
      ...generateManyHoldModifier(
        ["d", "left_command"],
        ["k", "right_command"],
        ["semicolon", "right_control"],
        ["a", "left_alt"],
        ["l", "right_alt"],
      ),
    ],
  },
];

const configContent: KarabinerConfig = {
  profiles: [
    {
      name: "Default",
      selected: true,
      virtual_hid_keyboard: { keyboard_type_v2: "ansi" },
      complex_modifications: {
        rules,
        parameters: {
          "basic.simultaneous_threshold_milliseconds": 80,
          "basic.to_delayed_action_delay_milliseconds": 100,
          "basic.to_if_alone_timeout_milliseconds": 150,
          "basic.to_if_held_down_threshold_milliseconds": 150,
        },
      },
    },
  ],
};

fs.writeFileSync("karabiner.json", JSON.stringify(configContent, null, 2));

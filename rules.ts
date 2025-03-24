import fs from "fs";
import { KarabinerConfig, KarabinerRules } from "./types";
import {
  createHyperSubLayers,
  app,
  generateHoldModifierAndIfAlone,
} from "./utils";

const rules: KarabinerRules[] = [
  {
    description: "Hyper Key (⌃⌥⇧⌘)",
    manipulators: [
      {
        description: "quote -> Hyper Key",
        from: {
          key_code: "quote",
          modifiers: {
            optional: ["any"],
          },
        },
        to: [
          {
            set_variable: {
              name: "hyper",
              value: 1,
            },
          },
        ],
        to_after_key_up: [
          {
            set_variable: {
              name: "hyper",
              value: 0,
            },
          },
        ],
        to_if_alone: [
          {
            key_code: "quote",
          },
        ],
        type: "basic",
      },
    ],
  },

  {
    description: "D -> Left Command",
    manipulators: [
      generateHoldModifierAndIfAlone("d", "left_command"),
      generateHoldModifierAndIfAlone("k", "right_command"),
    ],
  },

  ...createHyperSubLayers({
    // o = "Open" applications
    o: {
      g: app("Google Chrome"),
      s: app("Slack"),
      t: app("Kitty"),
      f: app("Finder"),
      p: app("Spotify"),
    },
  }),
];

const configContent: KarabinerConfig = {
  profiles: [
    {
      name: "Default",
      selected: true,
      virtual_hid_keyboard: { keyboard_type_v2: "ansi" },
      complex_modifications: {
        rules,
        parameters: { "basic.simultaneous_threshold_milliseconds": 200 },
      },
    },
  ],
};

fs.writeFileSync("karabiner.json", JSON.stringify(configContent, null, 2));

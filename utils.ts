import { To, KeyCode, Manipulator, KarabinerRule } from "./types";

/**
 * Custom way to describe a command in a layer
 */
export interface LayerCommand {
  to: To[];
  description?: string;
}

type HyperKeySublayer = {
  // The ? is necessary, otherwise we'd have to define something for _every_ key code
  [key_code in KeyCode]?: LayerCommand;
};

export function generateManyHoldModifier(
  ...pairs: [KeyCode, KeyCode][]
): Manipulator[] {
  return pairs.map(([input, hold]) => generateHoldModifier(input, hold));
}

/**
 * Generate a manipulator that will trigger a modifier key if held,
 * and the original key if pressed alone
 * https://gist.github.com/eytanhanig/6a35b718c9de5a232dd7d24d9f2abcfd#file-home_row_modifiers-to_alone-json-rb-L133
 */
export function generateHoldModifier(
  input: KeyCode,
  hold: KeyCode,
): Manipulator {
  return {
    from: { key_code: input, modifiers: { optional: ["any"] } },
    to_if_alone: [{ key_code: input, halt: true }],
    to_if_held_down: [{ key_code: hold }],
    to_delayed_action: { to_if_canceled: [{ key_code: input }] },
    type: "basic",
  };
}

/**
 * Create a Hyper Key sublayer, where every command is prefixed with a key
 * e.g. Hyper + O ("Open") is the "open applications" layer, I can press
 * e.g. Hyper + O + G ("Google Chrome") to open Chrome
 */
export function createHyperSubLayer(
  sublayer_key: KeyCode,
  commands: HyperKeySublayer,
  allSubLayerVariables: string[],
): Manipulator[] {
  const subLayerVariableName = generateSubLayerVariableName(sublayer_key);

  return [
    // When Hyper + sublayer_key is pressed, set the variable to 1; on key_up, set it to 0 again
    {
      description: `Toggle Hyper sublayer ${sublayer_key}`,
      type: "basic",
      from: {
        key_code: sublayer_key,
        modifiers: {
          optional: ["any"],
        },
      },
      to_after_key_up: [
        {
          set_variable: {
            name: subLayerVariableName,
            // The default value of a variable is 0: https://karabiner-elements.pqrs.org/docs/json/complex-modifications-manipulator-definition/conditions/variable/
            // That means by using 0 and 1 we can filter for "0" in the conditions below and it'll work on startup
            value: 0,
          },
        },
      ],
      to: [
        {
          set_variable: {
            name: subLayerVariableName,
            value: 1,
          },
        },
      ],
      // This enables us to press other sublayer keys in the current sublayer
      // (e.g. Hyper + O > M even though Hyper + M is also a sublayer)
      // basically, only trigger a sublayer if no other sublayer is active
      conditions: [
        ...allSubLayerVariables
          .filter(
            (subLayerVariable) => subLayerVariable !== subLayerVariableName,
          )
          .map((subLayerVariable) => ({
            type: "variable_if" as const,
            name: subLayerVariable,
            value: 0,
          })),
        {
          type: "variable_if",
          name: "hyper",
          value: 1,
        },
      ],
    },
    // Define the individual commands that are meant to trigger in the sublayer
    ...(Object.keys(commands) as (keyof typeof commands)[]).map(
      (command_key): Manipulator => ({
        ...commands[command_key],
        type: "basic" as const,
        from: {
          key_code: command_key,
          modifiers: {
            optional: ["any"],
          },
        },
        // Only trigger this command if the variable is 1 (i.e., if Hyper + sublayer is held)
        conditions: [
          {
            type: "variable_if",
            name: subLayerVariableName,
            value: 1,
          },
        ],
      }),
    ),
  ];
}

/**
 * Create all hyper sublayers. This needs to be a single function, as well need to
 * have all the hyper variable names in order to filter them and make sure only one
 * activates at a time
 */
export function createHyperSubLayers(subLayers: {
  [key_code in KeyCode]?: HyperKeySublayer | LayerCommand;
}): KarabinerRule[] {
  const allSubLayerVariables = (
    Object.keys(subLayers) as (keyof typeof subLayers)[]
  ).map((sublayer_key) => generateSubLayerVariableName(sublayer_key));

  return Object.entries(subLayers).map(([key, value]) =>
    "to" in value
      ? {
          description: `Hyper Key + ${key}`,
          manipulators: [
            {
              ...value,
              type: "basic" as const,
              from: {
                key_code: key as KeyCode,
                modifiers: {
                  optional: ["any"],
                },
              },
              conditions: [
                {
                  type: "variable_if",
                  name: "hyper",
                  value: 1,
                },
                ...allSubLayerVariables.map((subLayerVariable) => ({
                  type: "variable_if" as const,
                  name: subLayerVariable,
                  value: 0,
                })),
              ],
            },
          ],
        }
      : {
          description: `Hyper Key sublayer "${key}"`,
          manipulators: createHyperSubLayer(
            key as KeyCode,
            value,
            allSubLayerVariables,
          ),
        },
  );
}

export function createSubLayer(
  leader: KeyCode,
  subLayers: {
    [key_code in KeyCode]?: LayerCommand;
  },
): KarabinerRule[] {
  const variableName = `sublayer_${leader}`;

  return [
    {
      description: `SubLayer ${leader}`,
      manipulators: [
        {
          type: "basic",
          from: { key_code: leader, modifiers: { optional: ["any"] } },
          to_if_alone: [{ key_code: leader, halt: true }],
          to_if_held_down: [{ set_variable: { name: variableName, value: 1 } }],
          to_after_key_up: [{ set_variable: { name: variableName, value: 0 } }],
          to_delayed_action: { to_if_canceled: [{ key_code: leader }] },
          parameters: {
            "basic.to_if_alone_timeout_milliseconds": 300,
            "basic.to_if_held_down_threshold_milliseconds": 200,
            "basic.to_delayed_action_delay_milliseconds": 100,
          },
        },
        ...Object.entries(subLayers).map(
          ([key, { to, description }]) =>
            ({
              type: "basic",
              description: description || `Hold ${leader} + ${key}`,
              to,
              from: {
                key_code: key as KeyCode,
                modifiers: { optional: ["any"] },
              },
              conditions: [
                {
                  type: "variable_if",
                  name: variableName,
                  value: 1,
                },
              ],
            }) satisfies Manipulator,
        ),
      ],
    },
  ];
}

function generateSubLayerVariableName(key: KeyCode) {
  return `hyper_sublayer_${key}`;
}

/**
 * Shortcut for "open" shell command
 */
export function open(...what: string[]): LayerCommand {
  return {
    to: what.map((w) => ({
      shell_command: `open ${w}`,
    })),
    description: `Open ${what.join(" & ")}`,
  };
}

/**
 * Utility function to create a LayerCommand from a tagged template literal
 * where each line is a shell command to be executed.
 */
export function shell(
  strings: TemplateStringsArray,
  ...values: any[]
): LayerCommand {
  const commands = strings.reduce((acc, str, i) => {
    const value = i < values.length ? values[i] : "";
    const lines = (str + value)
      .split("\n")
      .filter((line) => line.trim() !== "");
    acc.push(...lines);
    return acc;
  }, [] as string[]);

  return {
    to: commands.map((command) => ({
      shell_command: command.trim(),
    })),
    description: commands.join(" && "),
  };
}

/**
 * Shortcut for managing window sizing with Rectangle
 */
export function rectangle(name: string): LayerCommand {
  return {
    to: [
      {
        shell_command: `open -g rectangle://execute-action?name=${name}`,
      },
    ],
    description: `Window: ${name}`,
  };
}

/**
 * Shortcut for "Open an app" command (of which there are a bunch)
 */
export function app(name: string): LayerCommand {
  return open(`-a '${name}.app'`);
}

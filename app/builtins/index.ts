import { type Builtin } from "../shell/types";

import { echo } from "./echo";
import { exit } from "./exit";
import { pwd } from "./pwd";
import { type } from "./type";
import { cd } from "./cd";

export const builtins: Record<string, Builtin> = {
  exit,
  echo,
  type,
  pwd,
  cd
}
import type {
  FileSystemAdapter,
  StatAsynchronousMethod,
  StatSynchronousMethod,
} from "./adapters/fs";
import * as async from "./providers/async";
import Settings, { Options } from "./settings";
import type { Stats } from "./types";
declare type AsyncCallback = async.AsyncCallback;
declare function stat(path: string, callback: AsyncCallback): void;
declare function stat(
  path: string,
  optionsOrSettings: Options | Settings,
  callback: AsyncCallback,
): void;
declare namespace stat {
  function __promisify__(
    path: string,
    optionsOrSettings?: Options | Settings,
  ): Promise<Stats>;
}
declare function statSync(
  path: string,
  optionsOrSettings?: Options | Settings,
): Stats;
export {
  AsyncCallback,
  FileSystemAdapter,
  Options,
  Settings,
  stat,
  StatAsynchronousMethod,
  Stats,
  statSync,
  StatSynchronousMethod,
};

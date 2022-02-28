import * as unist from '../node_modules/@types/unist/index.d.ts'
import type {Buffer} from 'https://deno.land/std@0.127.0/io/mod.ts'
import type {URL} from './minurl.shared.js'
import {path} from './minpath.js'
import {proc} from './minproc.js'
import {urlToPath, isUrl} from './minurl.js'
import buffer from '../node_modules/is-buffer/index.js'
import {VFileMessage} from '../node_modules/vfile-message/index.js'
import isBuffer from '../node_modules/is-buffer/index.js'

export type Node = unist.Node
export type Position = unist.Position
export type Point = unist.Point

interface Stringable {
  toString():string
}
export type VFileValue = string | Stringable | Buffer

export interface VFileDataMap {}
export type VFileData = Record<string, unknown> & Partial<VFileDataMap>

export interface VFileCoreOptions{
  value: VFileValue
  cwd: string
  history: string[]
  path: string|URL
  basename: string
  stem: string
  extname: string
  dirname: string
  data: VFileData
}

export type VFileOptions =  VFileCoreOptions & {[key: string]: unknown}
export type VFileCompatible =  VFileOptions | VFile | URL | VFileValue
export type BufferEncoding = 'ascii'|'utf8'|'utf-8'|'utf16le'|'ucs2'|'ucs-2'|'base64'|'base64url'|'latin1'|'binary'|'hex'
export interface VfileMap {
  version : number
  sources : string[]
  names : string[]
  sourceRoot : string|undefined
  sourcesContent : string[]|undefined
  mappings : string
  file : string
}
export type VFileReporterSettings = Record<string, unknown>
export type VFileReporter = <T = VFileReporterSettings>(files: Array<VFile>, options: T) => string

type IOrderOpts =
  | 'history'
  | 'path'
  | 'basename'
  | 'stem'
  | 'extname'
  | 'dirname'

const order = ['history', 'path', 'basename', 'stem', 'extname', 'dirname']

export class VFile {
  data: VFileData
  messages: VFileMessage[]
  history: string[]
  cwd: string
  value: VFileValue
  stored: boolean
  result: unknown
  map: VfileMap | undefined
  [ otherKeys:string ] : unknown

  constructor(value?:VFileCompatible) {
    let options: VFileOptions

    if (!value) {
      options = {} as VFileOptions
    } else if (typeof value === 'string' || buffer(value)) {
      options = {value} as VFileOptions
    } else if (isUrl(value)) {
      options = {path: value} as VFileOptions
    } else {
      options = value as VFileOptions
    }

    this.data = {} as VFileData
    this.messages = []

    this.cwd = proc.cwd()
    this.value = options.value ?? '' as VFileValue
    this.stored = false //
    this.result = undefined //
    this.map = undefined as VfileMap | undefined //

    this.basename = options.basename
    this.history = options.history ?? [] as string[]
    this.path = options.path
    this.basename = options.basename
    this.stem = options.stem
    this.extname = options.extname
    this.dirname = options.dirname

    // Set non-path related properties.
    for (const prop in options) {
      if (!order.includes(prop)) this[prop] = options[prop]
    }
  }

  get path():string {
    return this.history[this.history.length - 1]
  }

  set path(path: string|URL ) {
    const p:string = isUrl(path) ? urlToPath(path) : path
    assertNonEmpty(p, 'path')
    if (this.path !== p) { this.history.push(p) }
  }

  /**
   * Access parent path (`~`).
   */
  get dirname() {
    return typeof this.path === 'string' ? path.dirname(this.path) : undefined
  }

  /**
   * Set parent path (`~`).
   * Cannot be set if there's no `path` yet.
   */
  set dirname(dirname) {
    assertPath(this.basename, 'dirname')
    this.path = path.join(dirname || '', this.basename)
  }

  /**
   * Access basename (including extname) (`index.min.js`).
   */
  get basename() {
    return typeof this.path === 'string' ? path.basename(this.path) : undefined
  }

  /**
   * Set basename (`index.min.js`).
   * Cannot contain path separators.
   * Cannot be nullified either (use `file.path = file.dirname` instead).
   */
  set basename(basename) {
    assertNonEmpty(basename, 'basename')
    assertPart(basename, 'basename')
    this.path = path.join(this.dirname || '', basename)
  }

  /**
   * Access extname (including dot) (`.js`).
   */
  get extname() {
    return typeof this.path === 'string' ? path.extname(this.path) : undefined
  }

  /**
   * Set extname (including dot) (`.js`).
   * Cannot be set if there's no `path` yet and cannot contain path separators.
   */
  set extname(extname) {
    assertPart(extname, 'extname')
    assertPath(this.dirname, 'extname')

    if (extname) {
      if (extname.charCodeAt(0) !== 46 /* `.` */) {
        throw new Error('`extname` must start with `.`')
      }

      if (extname.includes('.', 1)) {
        throw new Error('`extname` cannot contain multiple dots')
      }
    }

    this.path = path.join(this.dirname, this.stem + (extname || ''))
  }

  /**
   * Access stem (w/o extname) (`index.min`).
   */
  get stem() {
    return typeof this.path === 'string'
      ? path.basename(this.path, this.extname)
      : undefined
  }

  /**
   * Set stem (w/o extname) (`index.min`).
   * Cannot be nullified, and cannot contain path separators.
   */
  set stem(stem) {
    assertNonEmpty(stem, 'stem')
    assertPart(stem, 'stem')
    this.path = path.join(this.dirname || '', stem + (this.extname || ''))
  }

  /**
   * Serialize the file
   */
  toString(encoding: BufferEncoding= 'utf8'):string {
    const v = this.value as VFileValue
    return isBuffer(v)
      ? (this.value as Buffer).toString()
      : this.value as string
  }

  /**
   * Create a message and associates it w/ the file.
   */
  message(reason:string|Error, place:Node|Position|Point, origin:string):VFileMessage {
    const message = new VFileMessage(reason, place, origin)

    if (this.path) {
      message.name = this.path + ':' + message.name
      message.file = this.path
    }

    message.fatal = false
    this.messages.push(message)
    return message
  }

  /**
   * Info: create a message, associate it with the file, and mark the fatality
   * as `null`.
   * Calls `message()` internally.
   */
  info(reason:string|Error, place:Node|Position|Point, origin:string):VFileMessage {
    const message = this.message(reason, place, origin)
    message.fatal = null
    return message
  }

  /**
   * Fail: create a message, associate it with the file, mark the fatality as
   * `true`.
   * Note: fatal errors mean a file is no longer processable.
   * Calls `message()` internally.
   *
   */
  fail(reason:string|Error, place:Node|Position|Point, origin:string):VFileMessage{
    const message = this.message(reason, place, origin)
    message.fatal = true
    throw message
  }
}

/**
 * Assert that `part` is not a path (as in, does not contain `path.sep`).
 */
function assertPart(part:string|undefined, name:string) {
  if (part && part.includes(path.sep)) { throw new Error(
      '`' + name + '` cannot be a path: did not expect `' + path.sep + '`'
    )
  }
}

/**
 * Assert that `part` is not empty.
 */
function assertNonEmpty(part:string|undefined, name:string): asserts part is string {
  if (!part) {
    throw new Error('`' + name + '` cannot be empty')
  }
}

function assertPath(path: string |undefined, name: string): asserts path is string {
  if (!path) { throw new Error('Setting `' + name + '` requires `path` to be set too') }
}

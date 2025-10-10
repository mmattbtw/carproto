/**
 * GENERATED CODE - DO NOT MODIFY
 */
import {
  type Auth,
  type Options as XrpcOptions,
  Server as XrpcServer,
  type StreamConfigOrHandler,
  type MethodConfigOrHandler,
  createServer as createXrpcServer,
} from '@atproto/xrpc-server'
import { schemas } from './lexicons.js'

export function createServer(options?: XrpcOptions): Server {
  return new Server(options)
}

export class Server {
  xrpc: XrpcServer
  net: NetNS

  constructor(options?: XrpcOptions) {
    this.xrpc = createXrpcServer(schemas, options)
    this.net = new NetNS(this)
  }
}

export class NetNS {
  _server: Server
  mmatt: NetMmattNS

  constructor(server: Server) {
    this._server = server
    this.mmatt = new NetMmattNS(server)
  }
}

export class NetMmattNS {
  _server: Server
  vitals: NetMmattVitalsNS

  constructor(server: Server) {
    this._server = server
    this.vitals = new NetMmattVitalsNS(server)
  }
}

export class NetMmattVitalsNS {
  _server: Server

  constructor(server: Server) {
    this._server = server
  }
}

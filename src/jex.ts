import { HttpError } from "./errors.ts"
import type {
  ActionConfig,
  Client,
  ClientConfig,
  EndpointConfig,
  EndpointRecord,
  Fetcher,
  Method,
  PossibleActionArgs,
  Result,
} from "./types.ts"
import { ulid } from "@std/ulid"
import { createInitAndUrl, parseData, sendRequest } from "./utils.ts"

/**************/
/*            */
/*   PUBLIC   */
/*            */
/**************/

export function jex<
  const TEndpointRecord extends EndpointRecord<TFetcher>,
  const TFetcher extends Fetcher = Fetcher,
>(
  config: ClientConfig<TEndpointRecord, TFetcher>,
) {
  const endpointEntries = Object
    .entries(config.endpoints)
    .map((
      [key, endpointConfig],
    ) => [key, createEndpoint(key, config, endpointConfig)])

  return Object.fromEntries(endpointEntries) as Client<
    TEndpointRecord,
    TFetcher
  >
}

/***************/
/*             */
/*   PRIVATE   */
/*             */
/***************/

function createEndpoint(
  path: string,
  clientConfig: ClientConfig<any, any>,
  endpointConfig: EndpointConfig<any>,
) {
  const actionEntries = Object
    .entries(endpointConfig)
    .filter(([key]) => key !== "plugins")
    .map((
      [key, actionConfig],
    ) => [
      key,
      createAction(
        path,
        clientConfig,
        endpointConfig,
        actionConfig as ActionConfig,
        key as Method,
      ),
    ])

  return Object.fromEntries(actionEntries)
}

function createAction(
  path: string,
  clientConfig: ClientConfig<any, Fetcher>,
  endpointConfig: EndpointConfig<any>,
  actionConfig: ActionConfig<any>,
  method: Method,
) {
  return async function (args?: PossibleActionArgs): Promise<Result<any>> {
    try {
      const id = clientConfig.idGenerator?.() ?? ulid()

      const { init, url } = await createInitAndUrl(
        path,
        clientConfig,
        endpointConfig,
        actionConfig,
        args,
        method,
        id,
      )

      const res = await sendRequest(
        clientConfig,
        endpointConfig,
        actionConfig,
        args,
        init,
        url,
        method,
        id,
      )

      const data = await parseData(actionConfig, res)

      if (!res.ok) {
        return {
          ok: false,
          status: res.status,
          statusText: res.statusText,
          error: new HttpError(res.status, res.statusText),
          data,
          raw: res,
        }
      }

      return {
        ok: true,
        status: res.status,
        statusText: res.statusText,
        data,
        raw: res,
      }
    } catch (e) {
      return {
        ok: false,
        data: null,
        error: e,
      }
    }
  }
}

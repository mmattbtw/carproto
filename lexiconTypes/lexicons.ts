/**
 * GENERATED CODE - DO NOT MODIFY
 */
import {
  type LexiconDoc,
  Lexicons,
  ValidationError,
  type ValidationResult,
} from '@atproto/lexicon'
import { type $Typed, is$typed, maybe$typed } from './util.js'

export const schemaDict = {
  NetMmattVitalsCar: {
    lexicon: 1,
    id: 'net.mmatt.vitals.car',
    defs: {
      main: {
        type: 'record',
        key: 'tid',
        record: {
          type: 'object',
          properties: {
            createdAt: {
              type: 'string',
              format: 'datetime',
              description: 'The unix timestamp of when the vital was recorded',
            },
            carFuelRange: {
              type: 'integer',
              description: 'The car fuel range value in miles',
            },
            carPercentFuelRemaining: {
              type: 'integer',
              description: 'The car fuel level value in percentage',
            },
            amountRemaining: {
              type: 'integer',
              description: 'The car fuel amount remaining value',
            },
            carTraveledDistance: {
              type: 'integer',
              description: 'The car traveled distance value',
            },
          },
          required: [
            'createdAt',
            'carFuelRange',
            'carPercentFuelRemaining',
            'amountRemaining',
            'carTraveledDistance',
          ],
        },
      },
    },
  },
} as const satisfies Record<string, LexiconDoc>
export const schemas = Object.values(schemaDict) satisfies LexiconDoc[]
export const lexicons: Lexicons = new Lexicons(schemas)

export function validate<T extends { $type: string }>(
  v: unknown,
  id: string,
  hash: string,
  requiredType: true,
): ValidationResult<T>
export function validate<T extends { $type?: string }>(
  v: unknown,
  id: string,
  hash: string,
  requiredType?: false,
): ValidationResult<T>
export function validate(
  v: unknown,
  id: string,
  hash: string,
  requiredType?: boolean,
): ValidationResult {
  return (requiredType ? is$typed : maybe$typed)(v, id, hash)
    ? lexicons.validate(`${id}#${hash}`, v)
    : {
        success: false,
        error: new ValidationError(
          `Must be an object with "${hash === 'main' ? id : `${id}#${hash}`}" $type property`,
        ),
      }
}

export const ids = {
  NetMmattVitalsCar: 'net.mmatt.vitals.car',
} as const

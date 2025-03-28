import {
  Hash,
  HexNumber,
  HexString,
  PackedSince,
  Script,
} from "@ckb-lumos/base";
import { normalizers, Reader } from "ckb-js-toolkit";

// Taken for now from https://github.com/xxuejie/ckb-js-toolkit/blob/68f5ff709f78eb188ee116b2887a362123b016cc/src/normalizers.js#L17-L69,
// later we can think about exposing those functions directly.
function normalizeHexNumber(length: number) {
  return function (debugPath: string, value: any) {
    if (!(value instanceof ArrayBuffer)) {
      let intValue = BigInt(value).toString(16);
      if (intValue.length % 2 !== 0) {
        intValue = "0" + intValue;
      }
      if (intValue.length / 2 > length) {
        throw new Error(
          `${debugPath} is ${
            intValue.length / 2
          } bytes long, expected length is ${length}!`
        );
      }
      const view = new DataView(new ArrayBuffer(length));
      for (let i = 0; i < intValue.length / 2; i++) {
        const start = intValue.length - (i + 1) * 2;
        view.setUint8(i, parseInt(intValue.substr(start, 2), 16));
      }
      value = view.buffer;
    }
    if (value.byteLength < length) {
      const array = new Uint8Array(length);
      array.set(new Uint8Array(value), 0);
      value = array.buffer;
    }
    return value;
  };
}

function normalizeRawData(length: number) {
  return function (debugPath: string, value: any) {
    value = new Reader(value).toArrayBuffer();
    if (length > 0 && value.byteLength !== length) {
      throw new Error(
        `${debugPath} has invalid length ${value.byteLength}, required: ${length}`
      );
    }
    return value;
  };
}

function normalizeObject(debugPath: string, obj: any, keys: object) {
  const result: any = {};

  for (const [key, f] of Object.entries(keys)) {
    const value = obj[key];
    if (value === undefined || value === null) {
      throw new Error(`${debugPath} is missing ${key}!`);
    }
    result[key] = f(`${debugPath}.${key}`, value);
  }
  return result;
}

function toNormalize(normalize: Function) {
  return function (debugPath: string, value: any) {
    return normalize(value, {
      debugPath,
    });
  };
}

export interface DepositLockArgs {
  owner_lock_hash: Hash;
  layer2_lock: Script;
  cancel_timeout: PackedSince;
}

export function NormalizeDepositLockArgs(
  args: object,
  { debugPath = "deposit_lock_args" } = {}
) {
  return normalizeObject(debugPath, args, {
    owner_lock_hash: normalizeRawData(32),
    layer2_lock: toNormalize(normalizers.NormalizeScript),
    cancel_timeout: normalizeHexNumber(8),
  });
}

/**
 * sudt_id: uint32
 * amount: uint128
 */
export interface Fee {
  sudt_id: HexNumber;
  amount: HexNumber;
}

export function NormalizeFee(fee: object, { debugPath = "fee" } = {}) {
  return normalizeObject(debugPath, fee, {
    sudt_id: normalizeHexNumber(4),
    amount: normalizeHexNumber(16),
  });
}

export interface RawWithdrawalRequest {
  nonce: HexNumber;
  // CKB amount
  capacity: HexNumber;
  // SUDT amount
  amount: HexNumber;
  sudt_script_hash: Hash;
  // layer2 account_script_hash
  account_script_hash: Hash;
  // buyer can pay sell_amount and sell_capacity to unlock
  sell_amount: HexNumber;
  sell_capacity: HexNumber;
  // layer1 lock to withdraw after challenge period
  owner_lock_hash: Hash;
  // layer1 lock to receive the payment, must exists on the chain
  payment_lock_hash: Hash;
  fee: Fee;
}
export interface WithdrawalRequest {
  raw: RawWithdrawalRequest;
  signature: HexString;
}

export function NormalizeRawWithdrawalRequest(
  raw_request: object,
  { debugPath = "raw_withdrawal_request" } = {}
) {
  return normalizeObject(debugPath, raw_request, {
    nonce: normalizeHexNumber(4),
    capacity: normalizeHexNumber(8),
    amount: normalizeHexNumber(16),
    sudt_script_hash: normalizeRawData(32),
    account_script_hash: normalizeRawData(32),
    sell_amount: normalizeHexNumber(16),
    sell_capacity: normalizeHexNumber(8),
    owner_lock_hash: normalizeRawData(32),
    payment_lock_hash: normalizeRawData(32),
    fee: toNormalize(NormalizeFee),
  });
}

export function NormalizeWithdrawalRequest(
  request: WithdrawalRequest,
  { debugPath = "withdrawal_request" } = {}
) {
  return normalizeObject(debugPath, request, {
    raw: toNormalize(NormalizeRawWithdrawalRequest),
    signature: normalizeRawData(65),
  });
}

export interface WithdrawalLockArgs {
  // layer2 account script hash
  account_script_hash: Hash;
  withdrawal_block_hash: Hash;
  withdrawal_block_number: HexNumber;
  // buyer can pay sell_amount token to unlock
  sudt_script_hash: Hash;
  sell_amount: HexNumber;
  sell_capacity: HexNumber;
  // layer1 lock to withdraw after challenge period
  owner_lock_hash: Hash;
  // layer1 lock to receive the payment, must exists on the chain
  payment_lock_hash: Hash;
}

export function NormalizeWithdrawalLockArgs(
  withdrawal_lock_args: WithdrawalLockArgs,
  { debugPath = "withdrawal_lock_args" } = {}
) {
  return normalizeObject(debugPath, withdrawal_lock_args, {
    account_script_hash: normalizeRawData(32),
    withdrawal_block_hash: normalizeRawData(32),
    withdrawal_block_number: normalizeHexNumber(8),
    sudt_script_hash: normalizeRawData(32),
    sell_amount: normalizeHexNumber(16),
    sell_capacity: normalizeHexNumber(8),
    owner_lock_hash: normalizeRawData(32),
    payment_lock_hash: normalizeRawData(32),
  });
}

export function NormalizeUnlockWithdrawalViaFinalize(
  unlock_withdrawal_finalize: object,
  { debugPath = "unlock_withdrawal_finalize" } = {}
) {
  return normalizeObject(debugPath, unlock_withdrawal_finalize, {});
}

export interface RawL2Transaction {
  from_id: HexNumber;
  to_id: HexNumber;
  nonce: HexNumber;
  args: HexString;
}

export function NormalizeRawL2Transaction(
  rawL2Transaction: RawL2Transaction,
  { debugPath = "raw_l2_transaction" } = {}
) {
  return normalizeObject(debugPath, rawL2Transaction, {
    from_id: normalizeHexNumber(4),
    to_id: normalizeHexNumber(4),
    nonce: normalizeHexNumber(4),
    args: normalizeRawData(-1),
  });
}

export interface L2Transaction {
  raw: RawL2Transaction;
  signature: HexString;
}

export function NormalizeL2Transaction(
  l2Transaction: L2Transaction,
  { debugPath = "l2_transaction" } = {}
) {
  return normalizeObject(debugPath, l2Transaction, {
    raw: toNormalize(NormalizeRawL2Transaction),
    signature: normalizeRawData(-1),
  });
}

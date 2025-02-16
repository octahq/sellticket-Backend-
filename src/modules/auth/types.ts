import { Address, Hex, SignableMessage, TypedData, TypedDataDefinition } from "viem";
import { Authorization } from "viem/experimental";
import { SmartAccountSigner } from "@aa-sdk/core";

export interface AuthDetails {
  email: string;
  walletAddress: Address;
  sessionKeyAddress: Address;
  timestamp: number;
}

export interface AuthParams {
  email: string;
  otp: string;
}

export interface KeyStoreData {
  ownerPrivateKey: string;
  walletAddress: string;
  sessionPrivateKey: string;
  sessionKeyAddress: string;
  permissions: Record<string, boolean>;
}

export interface SmartAccountSigner {
  signerType: string;
  getAddress(): Promise<Address>;
  signMessage(message: SignableMessage): Promise<Hex>;
  signTypedData<TTypedData extends TypedData, TPrimaryType extends keyof TTypedData>(
    params: TypedDataDefinition<TTypedData, TPrimaryType>
  ): Promise<Hex>;
  signAuthorization(
    unsignedAuthorization: Authorization<number, false>
  ): Promise<Authorization<number, true>>;
}
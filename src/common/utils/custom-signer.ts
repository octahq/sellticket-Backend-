// import type { Address } from "abitype";
// import type { SignableMessage, TypedData, TypedDataDefinition, Hex } from "viem";
// import { mnemonicToAccount } from "viem/accounts";
// import type { SmartAccountSigner } from "@aa-sdk/core/signer/types.js"; 
 

// export class CustomSigner implements SmartAccountSigner {
//   signerType = "CustomSigner"; // ✅ Required for Alchemy SDK
//   inner: any; // ✅ Holds the actual signer instance

//   constructor(mnemonic: string) {
//     // 🔥 Convert mnemonic to account using Viem
//     this.inner = mnemonicToAccount(mnemonic);
//   }

//   /**
//    * ✅ Returns the wallet address (required by Alchemy SDK)
//    */
//   async getAddress(): Promise<Address> {
//     return this.inner.address as Address;
//   }

//   /**
//    * ✅ Signs a message (required by Alchemy SDK)
//    */
//   async signMessage(message: SignableMessage): Promise<Hex> {
//     return this.inner.signMessage(message) as Promise<Hex>;
//   }

//   /**
//    * ✅ Signs EIP-712 typed data (required by Alchemy SDK)
//    */
//   async signTypedData<
//     TTypedData extends TypedData | Record<string, unknown>,
//     TPrimaryType extends keyof TTypedData | "EIP712Domain" = keyof TTypedData
//   >(params: TypedDataDefinition<TTypedData, TPrimaryType>): Promise<Hex> {
//     return this.inner.signTypedData(params) as Promise<Hex>;
//   }

//   /**
//    * ✅ Sign Authorization (Optional, but may be required for some Alchemy SDK operations)
//    */
//   // async signAuthorization(
//   //   unsignedAuthorization: { hash: `0x${string}` }
//   // ): Promise<{ hash: `0x${string}` }> {
//   //   return {
//   //     hash: await this.inner.signMessage(unsignedAuthorization.hash),
//   //   };
//   // }
// }

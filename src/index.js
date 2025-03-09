import fs from 'fs';
import { PublicKey, Keypair, Transaction, sendAndConfirmTransaction, Connection, TransactionInstruction } from '@solana/web3.js';
import fetch from 'node-fetch';
import base58 from 'bs58';

class SoycapJS {
  constructor({ rpcUrl, apiUrl, apiKey }) {
    this.connection = new Connection(rpcUrl, 'confirmed');
    this.apiUrl = apiUrl;
    this.apiKey = apiKey;
  }

  loadKeypair(keypairPath = './keypair.json') {
    const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf8'));
    return Keypair.fromSecretKey(new Uint8Array(keypairData));
  }

  generateKeypairJSON(privateKeyBase58, expectedPublicKey, outputPath = './keypair.json') {
    try {
      const secretKey = base58.decode(privateKeyBase58);
      const keypair = Keypair.fromSecretKey(secretKey);

      if (keypair.publicKey.toString() !== expectedPublicKey) {
        throw new Error('Public key does not match the provided private key.');
      }

      fs.writeFileSync(outputPath, JSON.stringify(Array.from(secretKey), null, 2));
      console.log(`✅ Keypair saved to ${outputPath}`);
      
      return keypair;
    } catch (err) {
      console.error('❌ Failed to generate keypair JSON:', err);
      throw err;
    }
  }

  async authenticateMerchant() {
    try {
      const response = await fetch(`${this.apiUrl}/merchants/authenticate`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey,
        },
      });

      if (!response.ok) {
        const errorResponse = await response.json();
        throw new Error(`Error: ${errorResponse.error} - ${errorResponse.message}`);
      }

      const data = await response.json();
      return data.token;
    } catch (err) {
      console.error('Failed to authenticate merchant:', err);
      throw err;
    }
  }

  async getRegisterConversionTransactionInstruction(referralId, amount, publicKey, token) {
    try {
      const requestUrl = `${this.apiUrl}/conversions/onchain/create/${referralId}/${publicKey}/${amount}`;
      const response = await fetch(requestUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorResponse = await response.json();
        throw new Error(`Error: ${errorResponse.error} - ${errorResponse.message}`);
      }

      return await response.json();
    } catch (err) {
      console.error('Failed to get transaction instruction:', err);
      throw err;
    }
  }

  async getDistributeRewardTransactionInstruction(campaignId, referralId, conversionId, publicKey, token) {
    try {
      const requestUrl = `${this.apiUrl}/distributions/onchain/create`;
      const response = await fetch(requestUrl, {
        method: 'POST',
        body: JSON.stringify({ campaignId, referralId, conversionId, owner: publicKey }),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorResponse = await response.json();
        throw new Error(`Error: ${errorResponse.error} - ${errorResponse.message}`);
      }

      return await response.json();
    } catch (err) {
      console.error('Failed to get transaction instruction:', err);
      throw err;
    }
  }

  async updateConversion(conversionId, metadata, token) {
    try {
      const requestUrl = `${this.apiUrl}/conversions/offchain/${conversionId}`;
      const response = await fetch(requestUrl, {
        method: 'PATCH',
        body: JSON.stringify(metadata),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorResponse = await response.json();
        throw new Error(`Error: ${errorResponse.error} - ${errorResponse.message}`);
      }

      return await response.json();
    } catch (err) {
      console.error('Failed to update conversion:', err);
      throw err;
    }
  }

  async signAndSendTransaction(txnInstruction, keypair) {
    try {
      const feePayer = new PublicKey(keypair.publicKey.toString());
      const instruction = new TransactionInstruction({
        keys: txnInstruction.keys.map(key => ({
          pubkey: new PublicKey(key.pubkey),
          isSigner: key.isSigner,
          isWritable: key.isWritable,
        })),
        programId: new PublicKey(txnInstruction.programId),
        data: Buffer.from(txnInstruction.data),
      });
  
      const { blockhash } = await this.connection.getLatestBlockhash();
      const transaction = new Transaction().add(instruction);
      transaction.feePayer = feePayer;
      transaction.recentBlockhash = blockhash;
  
      try {
        // Simulate transaction before sending
        const simulationResult = await this.connection.simulateTransaction(transaction);
        if (simulationResult.value.err) {
          throw new Error(`Preflight simulation failed: ${JSON.stringify(simulationResult.value.err)}`);
        }
      } catch (simErr) {
        console.error("Transaction simulation failed:", simErr);
        throw simErr;
      }
  
      // If simulation passes, send the transaction
      const signature = await sendAndConfirmTransaction(this.connection, transaction, [keypair], {
        commitment: "confirmed",
        preflightCommitment: "processed",
      });
  
      if (!signature) {
        throw new Error("Transaction failed: No signature returned.");
      }
  
      return signature;
    } catch (err) {
      console.error("Transaction Failed:", err.message || err);
      throw err;
    }
  }

  async registerConversion(referralId, amount, businessValue, token, keypair) {
    try {
      const txnInstruction = await this.getRegisterConversionTransactionInstruction(referralId, amount, keypair.publicKey.toString(), token);
      const signature = await this.signAndSendTransaction(txnInstruction.instruction, keypair);

			const CAMPAIGN_ID = txnInstruction.metadata.campaignId;
			const CONVERSION_ID = txnInstruction.metadata.conversionId;

			// Update conversion with additional metadata (business value)
			const updatedConversion = await this.updateConversion(CONVERSION_ID, {
					campaignId: CAMPAIGN_ID,
					referralId: referralId,
					ownerAddress: keypair.publicKey.toString(),
					rewardsPendingUSDC: amount,
					businessValue: businessValue // conversion's business value (gross revenue per conversion)
			}, token);

      return { instruction: txnInstruction, signature, conversion: updatedConversion };
    } catch (err) {
      console.error('Failed to register conversion:', err);
      throw err;
    }
  }

  async getUnpaidMerchantConversions(merchantId, token) {
    try {
      const requestUrl = `${this.apiUrl}/merchants/offchain/${merchantId}/conversions/unpaid`;
      const response = await fetch(requestUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorResponse = await response.json();
        throw new Error(`Error: ${errorResponse.error} - ${errorResponse.message}`);
      }

      return await response.json();
    } catch (err) {
      console.error('Failed to get unpaid merchant conversions:', err);
      throw err;
    }
  }

  async getUnpaidCampaignConversions(campaignId, token) {
    try {
      const requestUrl = `${this.apiUrl}/campaigns/offchain/${campaignId}/conversions/unpaid`;
      const response = await fetch(requestUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorResponse = await response.json();
        throw new Error(`Error: ${errorResponse.error} - ${errorResponse.message}`);
      }

      return await response.json();
    } catch (err) {
      console.error('Failed to get unpaid campaign conversions:', err);
      throw err;
    }
  }

  async getCampaigns(merchantId, token) {
    try {
      const requestUrl = `${this.apiUrl}/campaigns/offchain/campaigns/${merchantId}`;
      const response = await fetch(requestUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorResponse = await response.json();
        throw new Error(`Error: ${errorResponse.error} - ${errorResponse.message}`);
      }

      return await response.json();
    } catch (err) {
      console.error('Failed to get campaigns:', err);
      throw err;
    }
  }

  async getCampaign(campaignId, token) {
    try {
      const requestUrl = `${this.apiUrl}/campaigns/offchain/${campaignId}`;
      const response = await fetch(requestUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorResponse = await response.json();
        throw new Error(`Error: ${errorResponse.error} - ${errorResponse.message}`);
      }

      return await response.json();
    } catch (err) {
      console.error('Failed to get campaign:', err);
      throw err;
    }
  }

  async distributeReward(campaignId, referralId, conversionId, token, keypair) {
    try {
      const txnInstruction = await this.getDistributeRewardTransactionInstruction(campaignId, referralId, conversionId, keypair.publicKey.toString(), token);
      const signature = await this.signAndSendTransaction(txnInstruction.instruction, keypair);
      return { instruction: txnInstruction, signature };
    } catch (err) {
      console.error('Failed to distribute reward:', err);
      throw err;
    }
  }
}

export default SoycapJS;
# SoycapJS  

## Overview 
**SoycapJS** is a JavaScript SDK that provides seamless integration with the **Soycap.io** affiliate and rewards system on Solana. It allows merchants to authenticate, create and manage campaigns, register conversions, distribute rewards, and query financial data.  This library interacts with both **on-chain** and **off-chain** components via Soycap.io API endpoints and Solana transactions.  ## Installation  

```sh
npm install soycap-js
```

or using Yarn:

```sh
yarn add soycap-js
```

## Configuration

Before using **SoycapJS**, you must configure it with the required **RPC URL**, **API URL**, and **API Key**.

```js
import SoycapJS from 'soycap-js';

const config = {
  rpcUrl: 'https://mainnet.helius-rpc.com/?api-key=HELIUS_API_KEU',  // Replace with mainnet RPC URL or Helius RPC with your api key
  apiUrl: 'https://www.soycap.io/api',                               // SoyCap.io API Base URL
  apiKey: 'SOYCAP_API_KEY_HERE',                                     // API Key for authentication from SoyCap.io Merchant Dashboard
};

const api = new SoycapJS(config);
```

## Authentication

To interact with the API, you must first **authenticate the merchant**:

```js
const authToken = await api.authenticateMerchant();
console.log('Authenticated token:', authToken);
```

## Loading Keypair from a File

This method loads a Solana keypair from a JSON file, allowing the SDK to sign transactions.

```js
const keypair = api.loadKeypair('./keypair.json'); // Ensure the keypair file exists
console.log('Keypair loaded:', keypair.publicKey.toString());
```

## Generate Keypair JSON file from Phantow Secret Phrase

You can use this method to create `keypair.json` file form your Phantom Wallet Secret Phrase.  For more details on how to extract secret phase from Phantom reference to [SoyCap.io Docs - Integration - Keypairs](https://docs.soycap.io/integration/keypairs#step-1-export-secret-phrase-from-phantom-wallet)

```js
// Replace with your private key from Phantom Wallet
const PRIVATE_KEY = "your-secret-phrase-as-base58";
const PUBLIC_KEY = "your-public-key"; 

api.generateKeypairJSON(PRIVATE_KEY, PUBLIC_KEY, './keypair.json');
```

* * *

## Key Features

### 1️⃣ **Fetching Merchant Campaigns**

Retrieve all campaigns linked to a merchant:

```js
// Get MERCHANT_ID from merchant Dashboard
const campaigns = await api.getCampaigns(MERCHANT_ID, authToken);
console.log('Merchant campaigns:', campaigns);
```

Retrieve a **specific campaign** (including transactions):

```js
// Get CAMPAIGN_ID from merchant/campaigns Dashboard
const campaign = await api.getCampaign(CAMPAIGN_ID, authToken);
console.log('Campaign details:', campaign);
```

* * *

### 2️⃣ **Registering a Conversion**

This method **registers a conversion** (an affiliate-driven sale) **on-chain**, updates the conversion **off-chain**, and stores its metadata.

```js
const conversion = await api.registerConversion(
  REFERRAL_ID,
  REWARD_USDC, // reward in USDC
  BUSINESS_VALUE, // business value (gross revenue) created by this conversion in USDC
  authToken, 
  keypair
);

console.log('Conversion registered:', conversion);
```

* * *

### 3️⃣ **Distributing Rewards**

Once conversions are confirmed, distribute rewards **on-chain** to affiliates:

```js
const distributionResult = await api.distributeReward(
  CAMPAIGN_ID, 
  REFERRAL_ID, 
  CONVERSION_ID, 
  authToken, 
  keypair
);

console.log('Reward distributed successfully:', distributionResult);
```

* * *

### 4️⃣ **Handling Unpaid Conversions**

Merchants can query **unpaid conversions** before distributing payments:

#### **Get unpaid conversions for a merchant**

```js
const unpaidMerchantConversions = await api.getUnpaidMerchantConversions(MERCHANT_ID, authToken);
console.log('Unpaid Merchant Conversions:', unpaidMerchantConversions);
```

#### **Get unpaid conversions for a campaign**

```js
const unpaidCampaignConversions = await api.getUnpaidCampaignConversions(CAMPAIGN_ID, authToken);
console.log('Unpaid Campaign Conversions:', unpaidCampaignConversions);
```

#### **Auto-distribute unpaid rewards**

Loop through unpaid conversions and distribute rewards:

```js
for (const conversion of unpaidMerchantConversions) {
  try {
    const result = await api.distributeReward(
      conversion.campaignId,
      conversion.referralId,
      conversion.conversionId,
      authToken,
      keypair
    );
    console.log('Reward distributed:', result);
  } catch (err) {
    console.error('Reward distribution failed:', err);
  }
}
```

* * *

## **Full API Reference**

| Method | Description |
| --- | --- |
| `loadKeypair(keypairFile)` | Load keypair from json file |
| `generateKeypairJSON(PRIVATE_KEY, PUBLIC_KEY, fileOutput)` | Generate keypair JSON file form Phantom Wallet Secret Phrase |
| `authenticateMerchant()` | Authenticates a merchant and returns a token. |
| `getCampaigns(merchantId, token)` | Fetch all campaigns of a merchant. |
| `getCampaign(campaignId, token)` | Fetch details of a specific campaign. |
| `registerConversion(referralId, amount, businessValue, token, keypair)` | Register a new conversion on-chain and update metadata off-chain. |
| `distributeReward(campaignId, referralId, conversionId, token, keypair)` | Distribute a reward to an affiliate. |
| `getUnpaidMerchantConversions(merchantId, token)` | Fetch all unpaid conversions for a merchant. |
| `getUnpaidCampaignConversions(campaignId, token)` | Fetch all unpaid conversions for a campaign. |

* * *

## **Example Usage**

```js
import SoycapJS from 'soycap-js';

// ✅ Configuration for Solana Mainnet with Helius API
const config = {
  rpcUrl: 'https://mainnet.helius-rpc.com/?api-key=YOUR_HELIUS_API_KEY', // Replace with your Helius API Key
  apiUrl: 'https://www.soycap.io/api',
  apiKey: 'YOUR_SOYCAP_API_KEY', // Replace with your Soycap API Key
};

const api = new SoycapJS(config);

(async () => {
  try {
    console.log('Loading keypair...');
    const keypair = api.loadKeypair('./keypair.json'); // Ensure keypair.json exists

    console.log('Authenticating merchant...');
    const authToken = await api.authenticateMerchant();
    console.log('Authentication successful.');

    // Replace with your known merchant ID and campaign details
    const MERCHANT_ID = '01J5VXMZZ1059H91TZHZVG2QP7';
    
    console.log(`Fetching unpaid conversions for merchant: ${MERCHANT_ID}`);
    const unpaidConversions = await api.getUnpaidMerchantConversions(MERCHANT_ID, authToken);

    if (unpaidConversions.length === 0) {
      console.log('No unpaid conversions found for this merchant.');
      return;
    }

    const nextConversion = unpaidConversions[0]; // Take the first unpaid conversion

    console.log('Distributing reward for conversion:', nextConversion);
    
    const result = await api.distributeReward(
      nextConversion.campaignId,
      nextConversion.referralId,
      nextConversion.conversionId,
      authToken,
      keypair
    );

    console.log('✅ Reward distributed successfully:', result);
  } catch (error) {
    console.error('❌ Error during reward distribution:', error);
  }
})();
```
* * *

## **Contributing**

1.  Fork the repository.
2.  Clone the repository:
    
    ```sh
    git clone https://github.com/your-username/soycap-js.git
    ```
    
3.  Install dependencies:
    
    ```sh
    npm install
    ```
    
4.  Make your changes and create a pull request.

* * *

## **License**

This project is licensed under the MIT License.

# SoyCap.io JS

A Node.js client for interacting with Soycap's Solana-based conversion and reward distribution APIs.

## Installation

```bash
npm install soycap-js
```

## Usage

```js
import SoycapJS from 'soycap-js';

const api = new SoycapJS({
    rpcUrl: 'https://mainnet.helius-rpc.com/?api-key=your-helius-key',
    apiUrl: 'https://www.soycap.io/api',
    apiKey: 'merchant-api-key'
});

(async () => {
    try {
        const REFERRAL_ID = `SOYCAP_REF_ID`;
        const keypair = api.loadKeypair('./keypair.json');
        const authToken = await api.authenticateMerchant();

        // Register conversion for REFERRAL_ID
        const REWARD_USDC = 0.1;
        const conversion = await api.registerConversion(REFERRAL_ID, REWARD_USDC, authToken, keypair);

        // Update conversion with additional metadata (business value)
        const updatedConversion = await api.updateConversion(CONVERSION_ID, {
            campaignId: CAMPAIGN_ID,
            referralId: REFERRAL_ID,
            businessValue: 15 // conversion's business value (gross revenue per conversion)
        }, authToken);

        // Distribute reward
        const CAMPAIGN_ID = conversion.instruction.metadata.campaignId;
        const CONVERSION_ID = conversion.instruction.metadata.conversionId;

        await api.distributeReward(CAMPAIGN_ID, REFERRAL_ID, CONVERSION_ID, authToken, keypair);
    } catch (error) {
        console.error(error);
    }
})();
```

## Methods

-   `loadKeypair(keypairPath)`: Loads a Solana keypair from a JSON file
-   `authenticateMerchant()`: Authenticates with the Soycap API
-   `registerConversion(referralId, amount, token, keypair)`: Registers a conversion
-   `distributeReward(campaignId, referralId, conversionId, token, keypair)`: Distributes a reward
-   `updateConversion(conversionId, metadata, token)`: Updates conversion metadata off-chain
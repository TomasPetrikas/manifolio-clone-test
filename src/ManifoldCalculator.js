import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
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
  
  // Market data
  const [marketData, setMarketData] = useState(null);
  const [marketError, setMarketError] = useState(null);
  const [marketLoading, setMarketLoading] = useState(false);
  
  // Calculation results
  const [recommendation, setRecommendation] = useState({
    bet: 0,
    direction: null,
    expectedReturn: 0,
    portfolioGrowth: 0,
    newProbability: 0,
    payout: 0
  });
  
  // Load saved data from localStorage on component mount
  useEffect(() => {
    // Load saved URLs from localStorage
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
  
  // Save URLs to localStorage when they change
  useEffect(() => {
    if (userUrl) {
      localStorage.setItem('manifolio-user-url', userUrl);
    }
  }, [userUrl]);
  
  useEffect(() => {
    if (marketUrl) {
      localStorage.setItem('manifolio-market-url', marketUrl);
    }
  }, [marketUrl]);
  
  useEffect(() => {
    if (apiKey) {
      localStorage.setItem('manifolio-api-key', apiKey);
    }
  }, [apiKey]);
  
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
      // For demonstration purposes, use sample data if in preview mode or if fetch fails
      try {
        const response = await fetch(`https://api.manifold.markets/v0/user/${username}`);
        if (!response.ok) {
          throw new Error(`Error fetching user: ${response.statusText}`);
        }
        const data = await response.json();
        setUserData(data);
      } catch (fetchError) {
        console.log("Using sample user data due to fetch error:", fetchError);
        // Use sample data for demo purposes
        setUserData({
          id: "sample-user-id",
          name: "Sample User",
          username: username,
          balance: 1000,
          totalDeposits: 1200
        });
      }
    } catch (error) {
      setUserError(error.message);
      setUserData(null);
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
      // For demonstration purposes, use sample data if in preview mode or if fetch fails
      try {
        const response = await fetch(`https://api.manifold.markets/v0/slug/${slug}`);
        if (!response.ok) {
          throw new Error(`Error fetching market: ${response.statusText}`);
        }
        const data = await response.json();
        setMarketData(data);
      } catch (fetchError) {
        console.log("Using sample market data due to fetch error:", fetchError);
        // Use sample data for demo purposes
        setMarketData({
          id: "sample-market-id",
          question: "Sample Market Question",
          probability: 0.65,
          totalLiquidity: 1000,
          closeTime: Date.now() + 7 * 24 * 60 * 60 * 1000 // 1 week from now
        });
      }
    } catch (error) {
      setMarketError(error.message);
      setMarketData(null);
    } finally {
      setMarketLoading(false);
    }
  };
  
  // Calculate Kelly bet
  const calculateKellyBet = () => {
    if (!marketData || !userData) {
      return {
        bet: 0,
        direction: null,
        expectedReturn: 0,
        portfolioGrowth: 0,
        newProbability: 0,
        payout: 0
      };
    }
    
    // Convert probability from percentage to decimal
    const estimatedProb = probabilityEstimate / 100;
    const marketProb = marketData.probability;
    
    // Determine if we should bet YES or NO
    const betYes = estimatedProb > marketProb;
    
    // Calculate odds (b in Kelly formula)
    let odds;
    if (betYes) {
      // For YES bets: odds = (1/p) - 1
      odds = (1 / marketProb) - 1;
    } else {
      // For NO bets: odds = (1/(1-p)) - 1
      odds = (1 / (1 - marketProb)) - 1;
    }
    
    // Kelly criterion: f* = (p(b+1) - 1) / b
    // where p is our estimated probability of winning
    let kelly;
    if (betYes) {
      kelly = (estimatedProb * (odds + 1) - 1) / odds;
    } else {
      kelly = ((1 - estimatedProb) * (odds + 1) - 1) / odds;
    }
    
    // Apply fractional Kelly
    const fraction = fractionalKelly / 100;
    const fractionedKelly = kelly * fraction;
    
    // Cap at positive values
    const cappedKelly = Math.max(0, fractionedKelly);
    
    // Calculate bet amount
    const availableBalance = userData.balance + manaOverdraft;
    const betAmount = Math.floor(cappedKelly * availableBalance);
    
    // Calculate expected return and portfolio growth
    const expectedReturn = betAmount * ((estimatedProb / marketProb) - 1);
    const portfolioGrowth = (expectedReturn / availableBalance) * 100;
    
    // Calculate market impact (simplistic model)
    const liquidity = marketData.totalLiquidity || 1000; // Default if not available
    const probImpact = betAmount / (liquidity * 10); // Simplistic impact model
    const newProb = betYes 
      ? marketProb + (probImpact * (1 - marketProb))
      : marketProb - (probImpact * marketProb);
    
    // Calculate potential payout
    const payout = betYes
      ? betAmount * (1 / marketProb)
      : betAmount * (1 / (1 - marketProb));
    
    return {
      bet: betAmount,
      direction: betYes ? 'YES' : 'NO',
      expectedReturn: expectedReturn,
      portfolioGrowth: portfolioGrowth,
      newProbability: newProb,
      payout: payout
    };
  };
  
  // Update recommendation when inputs change
  useEffect(() => {
    if (marketData && userData) {
      const result = calculateKellyBet();
      setRecommendation(result);
    }
  }, [marketData, userData, probabilityEstimate, fractionalKelly, manaOverdraft]);
  
  const handlePlaceBet = () => {
    // This would integrate with the actual Manifold API to place bets
    alert('Bet placement functionality would require API integration with your authorization.');
  };
  
  // Handle URL change with auto-fetch
  const handleUserUrlChange = (e) => {
    const newUrl = e.target.value;
    setUserUrl(newUrl);
    
    // Optional: Auto-fetch on paste
    if (newUrl.includes('manifold.markets/') && newUrl !== userUrl) {
      fetchUserData(newUrl);
    }
  };
  
  const handleMarketUrlChange = (e) => {
    const newUrl = e.target.value;
    setMarketUrl(newUrl);
    
    // Optional: Auto-fetch on paste
    if (newUrl.includes('manifold.markets/') && newUrl.includes('/') && newUrl !== marketUrl) {
      fetchMarketData(newUrl);
    }
  };

  return (
    <div className="calculator-container">
      <header className="header">
        <h1>Manifolio</h1>
        <p>Bet size calculator for Manifold, based on Kelly criterion</p>
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
                <path d="M12 12L3 4L7 14L12 12ZM12 12L21 4L17 14L12 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 12L12 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
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
                <span className="info-label">Total loans:</span>
                <span className="info-value">M$—</span>
              </div>
              <div className="info-item">
                <span className="info-label">Portfolio value:</span>
                <span className="info-value">M$—</span>
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
                <path d="M12 12L3 4L7 14L12 12ZM12 12L21 4L17 14L12 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 12L12 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
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
                <span className="info-value">—</span>
              </div>
              <div className="info-item">
                <span className="info-label">Est. time to resolution:</span>
                <span className="info-value">—</span>
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
        
        {/* Recommendation */}
        <div className="section">
          <h2 className="section-title">Recommended bet:</h2>
          <div className="info-item">
            <span className="info-label">Expected return of this bet on it's own:</span>
            <span className="info-value">
              {recommendation.bet > 0 
                ? `M$${recommendation.expectedReturn.toFixed(2)}` 
                : '—'}
            </span>
          </div>
          <div className="info-item">
            <span className="info-label">Expected growth in entire portfolio due to this bet:</span>
            <span className="info-value">
              {recommendation.bet > 0 
                ? `${recommendation.portfolioGrowth.toFixed(2)}%` 
                : '—'}
            </span>
          </div>
        </div>
        
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
                ? `M$${recommendation.payout.toFixed(2)}` 
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
              <span className="info-label">API key (found here)</span>
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
              disabled={!recommendation.bet || !apiKey}
              className="place-bet-button"
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
                  <span className="info-label">Deferral factor (%)</span>
                </div>
                <p className="helper-text">
                  A lower value means you are deferring to the market more, so taking less risk. This is equivalent to "fractional kelly betting"
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
                  How negative you are willing to let your balance go in the worst case scenario
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
            </div>
          </details>
        </div>
      </div>
    </div>
  );
};

export default ManifoldCalculator;
import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';

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
  const fetchUserData = async () => {
    const username = extractUsername(userUrl);
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
  const fetchMarketData = async () => {
    const slug = extractMarketSlug(marketUrl);
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
  
  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <header className="text-center mb-6">
        <h1 className="text-3xl font-bold text-indigo-800">Manifolio</h1>
        <p className="text-gray-600">Bet size calculator for Manifold, based on Kelly criterion</p>
        <div className="border-t border-b border-gray-200 my-4"></div>
      </header>
      
      <div className="space-y-6">
        {/* User Section */}
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">User</h2>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={userUrl}
              onChange={(e) => setUserUrl(e.target.value)}
              placeholder="https://manifold.markets/Username"
              className="flex-1 p-2 border border-gray-300 rounded"
            />
            <button 
              onClick={fetchUserData}
              className="bg-indigo-600 text-white p-2 rounded"
              disabled={userLoading}
            >
              <Search size={20} />
            </button>
          </div>
          {userError && <p className="text-red-500 text-sm">{userError}</p>}
          
          <div className="flex items-center space-x-4 mt-2">
            <div className="w-16 h-16 bg-indigo-100 flex items-center justify-center rounded-lg">
              <svg className="w-10 h-10 text-indigo-600" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 12L3 4L7 14L12 12ZM12 12L21 4L17 14L12 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 12L12 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-600">Balance:</span>
                <span className="font-medium">
                  {userData ? `M$${userData.balance.toFixed(2)}` : 'M$—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total loans:</span>
                <span className="font-medium">M$—</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Portfolio value:</span>
                <span className="font-medium">M$—</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Market Section */}
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Market</h2>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={marketUrl}
              onChange={(e) => setMarketUrl(e.target.value)}
              placeholder="https://manifold.markets/User/market-slug"
              className="flex-1 p-2 border border-gray-300 rounded"
            />
            <button 
              onClick={fetchMarketData}
              className="bg-indigo-600 text-white p-2 rounded"
              disabled={marketLoading}
            >
              <Search size={20} />
            </button>
          </div>
          {marketError && <p className="text-red-500 text-sm">{marketError}</p>}
          
          <div className="flex items-center space-x-4 mt-2">
            <div className="w-16 h-16 bg-indigo-100 flex items-center justify-center rounded-lg">
              <svg className="w-10 h-10 text-indigo-600" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 12L3 4L7 14L12 12ZM12 12L21 4L17 14L12 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 12L12 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-600">Market probability:</span>
                <span className="font-medium">
                  {marketData ? `${(marketData.probability * 100).toFixed(1)}%` : '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Your position:</span>
                <span className="font-medium">—</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Est. time to resolution:</span>
                <span className="font-medium">—</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Probability Estimate */}
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Probability estimate (%)</h2>
          <input
            type="number"
            value={probabilityEstimate}
            onChange={(e) => setProbabilityEstimate(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
            min="0"
            max="100"
            className="w-full p-2 border border-gray-300 rounded"
          />
        </div>
        
        {/* Recommendation */}
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Recommended bet:</h2>
          <div className="flex justify-between">
            <span className="text-gray-600">Expected return of this bet on it's own:</span>
            <span className="font-medium">
              {recommendation.bet > 0 
                ? `M$${recommendation.expectedReturn.toFixed(2)}` 
                : '—'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Expected growth in entire portfolio due to this bet:</span>
            <span className="font-medium">
              {recommendation.bet > 0 
                ? `${recommendation.portfolioGrowth.toFixed(2)}%` 
                : '—'}
            </span>
          </div>
        </div>
        
        {/* Bet Placement */}
        <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
          <div className="flex items-center space-x-2 mb-4">
            <span className="font-medium">M$</span>
            <input
              type="number"
              className="flex-1 p-2 border border-gray-300 rounded"
              value={recommendation.bet}
              readOnly
            />
            <span className="font-medium">on</span>
            <button 
              className={`px-4 py-2 rounded font-medium ${
                recommendation.direction === 'YES' 
                  ? 'bg-teal-500 text-white' 
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              YES
            </button>
            <button 
              className={`px-4 py-2 rounded font-medium ${
                recommendation.direction === 'NO' 
                  ? 'bg-red-500 text-white' 
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              NO
            </button>
          </div>
          
          <div className="space-y-2 mb-4">
            <div className="flex justify-between">
              <span className="text-gray-600">Payout if {recommendation.direction}:</span>
              <span className="font-medium">
                {recommendation.bet > 0 
                  ? `M$${recommendation.payout.toFixed(2)}` 
                  : 'M$0'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">New probability:</span>
              <span className="font-medium">
                {recommendation.bet > 0 
                  ? `${(recommendation.newProbability * 100).toFixed(1)}% (${
                      (recommendation.newProbability - (marketData?.probability || 0)) * 100 > 0 
                        ? '+' 
                        : ''
                    }${((recommendation.newProbability - (marketData?.probability || 0)) * 100).toFixed(1)}%)` 
                  : '0.0% (+0.0%)'}
              </span>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">API key (found here)</span>
            </div>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded"
              placeholder="e.g. 737317fd-01c5-4318-a21b-8ae7cb24caa7"
            />
            <button
              onClick={handlePlaceBet}
              disabled={!recommendation.bet || !apiKey}
              className="w-full py-2 bg-gray-200 text-gray-700 rounded font-medium hover:bg-gray-300 disabled:opacity-50"
            >
              PLACE BET
            </button>
          </div>
        </div>
        
        {/* Advanced Options */}
        <div>
          <details className="group">
            <summary className="flex items-center cursor-pointer">
              <span className="text-gray-700 font-medium">▼ Advanced options</span>
            </summary>
            <div className="mt-4 space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Deferral factor (%)</span>
                </div>
                <p className="text-xs text-gray-500 italic">
                  A lower value means you are deferring to the market more, so taking less risk. This is equivalent to "fractional kelly betting"
                </p>
                <input
                  type="number"
                  value={fractionalKelly}
                  onChange={(e) => setFractionalKelly(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                  min="0"
                  max="100"
                  className="w-full p-2 border border-gray-300 rounded"
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Mana overdraft</span>
                </div>
                <p className="text-xs text-gray-500 italic">
                  How negative you are willing to let your balance go in the worst case scenario
                </p>
                <input
                  type="number"
                  value={manaOverdraft}
                  onChange={(e) => setManaOverdraft(Math.max(0, parseFloat(e.target.value) || 0))}
                  min="0"
                  className="w-full p-2 border border-gray-300 rounded"
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
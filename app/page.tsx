'use client';

import { useState, useEffect } from 'react';
import InstallWallet from './components/login/install-wallet';
import ConnectWallet from './components/login/connect-wallet';
import GetGlobalFeed from './components/feeds/get-global-feed';
import QuerySettings from './components/settings/query-settings';
import GetProfileFeed from './components/feeds/get-profile-feed';
import GetCommentsFeed from './components/feeds/get-comments-feed';
import NavigationPanel from './components/navigation/navigation-panel';
import AuditButton from './components/audit/audit-button';
import DataTransferButtons from './components/portable_queries/data_transfer_buttons'

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [hasWallet, setHasWallet] = useState(false);
  const [walletConnected, setWalletConnected] = useState(false);
  const [account, setAccount] = useState(['Not connected']);
  const [accountChanged, setAccountChanged] = useState(false);
  const [getGlobalFeed, setGetGlobalFeed] = useState(false);
  const [howManyPosts, setHowManyPosts] = useState(6);
  const [fromBlock, setFromBlock] = useState(0);
  const [toBlock, setToBlock] = useState(10_000_000);
  const [getProfileFeed, setGetProfileFeed] = useState(false);
  const [profileAddress, setProfileAddress] = useState('');
  const [hideGetGlobalPosts, setHideGetGlobalPosts] = useState('');
  const [showProfile, setShowProfile] = useState(false);
  const [howManyComments, setHowManyComments] = useState(3);
  const [fromBlockComments, setFromBlockComments] = useState(0);
  const [toBlockComments, setToBlockComments] = useState(10_000_000);
  const [getCommentsFeed, setGetCommentsFeed] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentTarget, setCommentTarget] = useState(null as any);
  const [howManyReposts, setHowManyReposts] = useState(1);
  const [fromBlockReposts, setFromBlockReposts] = useState(0);
  const [toBlockReposts, setToBlockReposts] = useState(10_000_000);
  const [postsContractAddress] = useState(process.env.NEXT_PUBLIC_POSTS_CONTRACT_ADDRESS as string);
  const [reactionsContractAddress] = useState(process.env.NEXT_PUBLIC_REACTIONS_CONTRACT_ADDRESS as string);
  const [commentsContractAddress] =  useState(process.env.NEXT_PUBLIC_COMMENTS_CONTRACT_ADDRESS as string);
  const [repostsContractAddress] = useState(process.env.NEXT_PUBLIC_REPOSTS_CONTRACT_ADDRESS as string);
  const [feedType, setFeedType] = useState(null as any);
  const [queries, setQueries] = useState([] as any[]);
  const [isDBLoaded, setIsDBLoaded] = useState(false);
  const [pastQuery, setPastQuery] = useState(null as any);
  const [currentQuery, setCurrentQuery] = useState(null as any);
  const [errorMessage, setErrorMessage] = useState(null as any);
  const [auditing, setAuditing] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [comments, setComments] = useState([] as any[]);
  const [mergedContent, setMergedContent] = useState([] as any);
  const [selectedNavigation, setSelectedNavigation] = useState(false);

  const walletConnection = () => setWalletConnected(!walletConnected);

  useEffect(() => {
    (async () => {
      if (typeof (window as any).mina !== 'undefined') {
        setHasWallet(true);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      if (walletConnected) {
        try {
          const a = await (window as any).mina.requestAccounts();
          setAccount(a);
        } catch {
          setWalletConnected(false);
          setAccount(['Not connected']);
        }
      }
    })();
  }, [walletConnected, accountChanged]);

  useEffect(() => {
    if (typeof (window as any).mina !== 'undefined') {
      (window as any).mina?.on('accountsChanged', () => {
        setAccountChanged(!accountChanged);
      });
    }
    
    return () => (window as any).mina?.off('accountsChanged');
  });

  useEffect(() => {
    if (profileAddress !== '') {
      setHideGetGlobalPosts('hidden');
      setShowComments(false);
      setCommentTarget(null);
      setShowProfile(true);
    }
  }, [profileAddress]);

  useEffect(() => {
    if (commentTarget !== null) {
      setHideGetGlobalPosts('hidden');
      setShowProfile(false);
      setProfileAddress('');
      setShowComments(true);
    }
  }, [commentTarget]);

  useEffect(() => {
    setInitialLoading(false);
  }, []);

  return (
  <main>
    <div className="flex min-h-screen">
      <div className="flex flex-col w-1/5 border-r">
        <div className="p-4 flex-grow">
          <h1 className="text-2xl font-bold mb-3">WrdHom: The auditable social-media platform</h1>
          <br/>
          {initialLoading ? null : !hasWallet && <InstallWallet />}
          {initialLoading ? null : <p className="text-s mb-2 break-words">{hasWallet ? 'Your account is: ' + account[0] : ''}</p>}
          {initialLoading ? null : hasWallet && !walletConnected && <ConnectWallet walletConnection={walletConnection}/>}
          {!loading && <NavigationPanel
            queries={queries}
            currentQuery={currentQuery}
            setCurrentQuery={setCurrentQuery}
            setProfileAddress={setProfileAddress}
            setShowProfile={setShowProfile}
            setShowComments={setShowComments}
            setCommentTarget={setCommentTarget}
            setHideGetGlobalPosts={setHideGetGlobalPosts}
            setFeedType={setFeedType}
            setComments={setComments}
            setMergedContent={setMergedContent}
            setSelectedNavigation={setSelectedNavigation}
            selectedNavigation={selectedNavigation}
          />}
        </div>
        {initialLoading ? null : <AuditButton
          currentQuery={currentQuery}
          postsContractAddress={postsContractAddress}
          reactionsContractAddress={reactionsContractAddress}
          commentsContractAddress={commentsContractAddress}
          repostsContractAddress={repostsContractAddress}
          setAuditing={setAuditing}
          setErrorMessage={setErrorMessage}
          setQueries={setQueries}
          auditing={auditing}
          setCurrentQuery={setCurrentQuery}
        />}
        {initialLoading ? null : <DataTransferButtons
          queries={queries}
          setQueries={setQueries}
          setLoading={setLoading}
          setCurrentQuery={setCurrentQuery}
          setSelectedNavigation={setSelectedNavigation}
        />}
      </div>
      <GetGlobalFeed getGlobalFeed={getGlobalFeed}
        howManyPosts={howManyPosts}
        fromBlock={fromBlock}
        toBlock={toBlock}
        setProfileAddress={setProfileAddress}
        hideGetGlobalPosts={hideGetGlobalPosts}
        walletConnected={walletConnected}
        setCommentTarget={setCommentTarget}
        howManyReposts={howManyReposts}
        fromBlockReposts={fromBlockReposts}
        toBlockReposts={toBlockReposts}
        account={account}
        feedType={feedType}
        setFeedType={setFeedType}
        queries={queries}
        setQueries={setQueries}
        isDBLoaded={isDBLoaded}
        setIsDBLoaded={setIsDBLoaded}
        pastQuery={pastQuery}
        setPastQuery={setPastQuery}
        setCurrentQuery={setCurrentQuery}
        currentQuery={currentQuery}
        loading={loading}
        setLoading={setLoading}
        errorMessage={errorMessage}
        setErrorMessage={setErrorMessage}
        setMergedContent={setMergedContent}
        mergedContent={mergedContent}
      />
      {showProfile && <GetProfileFeed
        getProfileFeed={getProfileFeed}
        profileAddress={profileAddress}
        setProfileAddress={setProfileAddress}
        howManyPosts={howManyPosts}
        fromBlock={fromBlock}
        toBlock={toBlock}
        walletConnected={walletConnected}
        setCommentTarget={setCommentTarget}
        howManyReposts={howManyReposts}
        fromBlockReposts={fromBlockReposts}
        toBlockReposts={toBlockReposts}
        account={account}
        feedType={feedType}
        setFeedType={setFeedType}
        queries={queries}
        setQueries={setQueries}
        isDBLoaded={isDBLoaded}
        setIsDBLoaded={setIsDBLoaded}
        pastQuery={pastQuery}
        setPastQuery={setPastQuery}
        setCurrentQuery={setCurrentQuery}
        currentQuery={currentQuery}
        loading={loading}
        setLoading={setLoading}
        errorMessage={errorMessage}
        setErrorMessage={setErrorMessage}
        setMergedContent={setMergedContent}
        mergedContent={mergedContent}
      />}
      {showComments && <GetCommentsFeed
        commentTarget={commentTarget}
        setProfileAddress={setProfileAddress}
        howManyComments={howManyComments}
        fromBlockComments={fromBlockComments}
        toBlockComments={toBlockComments}
        getCommentsFeed={getCommentsFeed}
        walletConnected={walletConnected}
        setCommentTarget={setCommentTarget}
        account={account}
        feedType={feedType}
        setFeedType={setFeedType}
        queries={queries}
        setQueries={setQueries}
        isDBLoaded={isDBLoaded}
        setIsDBLoaded={setIsDBLoaded}
        pastQuery={pastQuery}
        setPastQuery={setPastQuery}
        setCurrentQuery={setCurrentQuery}
        currentQuery={currentQuery}
        setComments={setComments}
        errorMessage={errorMessage}
        setErrorMessage={setErrorMessage}
        setLoading={setLoading}
        loading={loading}
      />}
      <div className="flex flex-col w-1/5 border-r">
        {initialLoading ? null : <div className="flex-grow">
          <QuerySettings
            howManyPosts={howManyPosts}
            setHowManyPosts={setHowManyPosts}
            fromBlock={fromBlock}
            setFromBlock={setFromBlock}
            toBlock={toBlock}
            setToBlock={setToBlock}
            howManyComments={howManyComments}
            setHowManyComments={setHowManyComments}
            fromBlockComments={fromBlockComments}
            setFromBlockComments={setFromBlockComments}
            toBlockComments={toBlockComments}
            setToBlockComments={setToBlockComments}
            howManyReposts={howManyReposts}
            setHowManyReposts={setHowManyReposts}
            fromBlockReposts={fromBlockReposts}
            setFromBlockReposts={setFromBlockReposts}
            toBlockReposts={toBlockReposts}
            setToBlockReposts={setToBlockReposts}
          />
        </div>}
        {initialLoading ? null : !showProfile && !showComments && (
            <div className="p-4 w-full mb-32">
              <button 
                className="w-full p-2 bg-black text-white"
                onClick={() => setGetGlobalFeed(!getGlobalFeed)}>
                Update Feed
              </button>
            </div>
          )}
        {showProfile && (
          <div className="p-4 w-full mb-32">
            <button 
              className="w-full p-2 bg-black text-white"
              onClick={() => setGetProfileFeed(!getProfileFeed)}>
              Update Profile Feed
            </button>
          </div>
        )}
        {showComments && (
          <div className="p-4 w-full mb-32">
            <button 
              className="w-full p-2 bg-black text-white"
              onClick={() => setGetCommentsFeed(!getCommentsFeed)}>
              Update Comments Feed
            </button>
          </div>
        )}
      </div>
    </div>
  </main>
  );
}

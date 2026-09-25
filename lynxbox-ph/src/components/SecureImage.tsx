import React, { useState, useEffect } from 'react';
import { propertyService } from '@/services/propertyService';

interface SecureImageProps {
  propertyId: string;
  imageKey: string;
  alt: string;
  className?: string;
  fallbackClassName?: string;
  onLoad?: () => void;
  onError?: (error: any) => void;
  cacheUrls?: boolean; // Whether to cache URLs in the hook
  onClick?: () => void; // Add onClick handler
  usePublicEndpoint?: boolean; // Whether to use public endpoint (no auth)
}

export const SecureImage: React.FC<SecureImageProps> = (props) => {
  const {
    propertyId,
    imageKey,
    alt,
    className = '',
    fallbackClassName = '',
    onLoad,
    onError,
    cacheUrls = true,
    usePublicEndpoint,
    onClick
  } = props;
  const [imageUrl, setImageUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const maxRetries = 3;
  const retryDelay = 1000; // 1 second

  const fetchImageUrl = async (attempt: number = 0) => {
    try {
      setIsLoading(true);
      setHasError(false);
      
      // Use secure temporary URL with 1-hour expiration. Only the public marketplace page
      // explicitly opts into the no-auth endpoint (usePublicEndpoint={true}); every other
      // caller (dashboard/owner views) must use the authenticated one, which doesn't require
      // the property to be status: 'available' — a draft/rented/etc. listing's own owner
      // still needs to see its photos. (The previous `|| propertyId` here made this always
      // true regardless of the prop, silently routing every dashboard view through the
      // public endpoint too — which is why images 404'd for anything not yet published.)
      const usePublic = usePublicEndpoint === true;

      const imageUrls = usePublic
        ? await propertyService.getPublicPropertyImageUrls(propertyId, [imageKey])
        : await propertyService.getPropertyImageUrls(propertyId, [imageKey]);
      const temporaryUrl = imageUrls[imageKey];

      if (!temporaryUrl || temporaryUrl === imageKey || !temporaryUrl.startsWith('http')) {
        throw new Error(`Invalid presigned URL received for ${imageKey}`);
      }
      setImageUrl(temporaryUrl);
      setIsLoading(false); // Explicitly set loading to false
      
    } catch (error: any) {
      console.error(`Error fetching image URL (attempt ${attempt + 1}):`, error);
      
      // Retry logic
      if (attempt < maxRetries - 1) {
        setTimeout(() => {
          fetchImageUrl(attempt + 1);
        }, retryDelay * (attempt + 1)); // Exponential backoff
      } else {
        setHasError(true);
        setIsLoading(false);
        onError?.(error as Error);
      }
    }
  };

  useEffect(() => {
    if (propertyId && imageKey) {
      fetchImageUrl();
    }
  }, [propertyId, imageKey, retryCount]);

  const handleImageLoad = () => {
    setIsLoading(false);
    setHasError(false);
    onLoad?.();
  };

  const handleImageError = (error: any) => {
    setIsLoading(false);
    setHasError(true);
    onError?.(error);
  };

  const handleRetry = () => {
    setRetryCount((prev: number) => prev + 1);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 ${className}`}>
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-8 h-8 bg-gray-300 rounded-full mb-2"></div>
          <div className="text-xs text-gray-500">Loading...</div>
        </div>
      </div>
    );
  }

  // Error state
  if (hasError) {
    return (
      <div className={`flex flex-col items-center justify-center bg-gray-100 ${fallbackClassName}`}>
        <div className="text-gray-400 mb-2">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <div className="text-xs text-gray-500 mb-2">Image unavailable</div>
        <button
          onClick={handleRetry}
          className="text-xs text-blue-500 hover:text-blue-700 underline"
        >
          Retry
        </button>
      </div>
    );
  }

  // Success state
  return (
    <img
      src={imageUrl}
      alt={alt}
      className={className}
      onLoad={handleImageLoad}
      onError={handleImageError}
      onClick={onClick}
    />
  );
};

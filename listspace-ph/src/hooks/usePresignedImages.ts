import { useState, useEffect } from 'react';
import { propertyService } from '@/services/propertyService';

export function usePresignedImages(propertyId: string, imageKeys: string[]) {
  const [imageUrls, setImageUrls] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!propertyId || imageKeys.length === 0) {
      setImageUrls({});
      return;
    }

    const fetchImageUrls = async () => {
      try {
        setLoading(true);
        setError(null);
        const urls = await propertyService.getPropertyImageUrls(propertyId, imageKeys);
        setImageUrls(urls);
      } catch (err: any) {
        setError(err.message || 'Failed to load image URLs');
        console.error('Error fetching presigned image URLs:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchImageUrls();
  }, [propertyId, imageKeys.join(',')]);

  const getImageUrl = (imageKey: string): string => {
    return imageUrls[imageKey] || '';
  };

  return {
    imageUrls,
    loading,
    error,
    getImageUrl,
  };
}

import React, { useState } from 'react';
import { SecureImage } from './SecureImage';

interface ImageGalleryProps {
  propertyId: string;
  imageKeys: string[];
  className?: string;
  imageClassName?: string;
  fallbackClassName?: string;
}

export const ImageGallery: React.FC<ImageGalleryProps> = ({
  propertyId,
  imageKeys,
  className = '',
  imageClassName = '',
  fallbackClassName = ''
}) => {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (!imageKeys || imageKeys.length === 0) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 ${fallbackClassName}`}>
        <div className="text-gray-400 text-center">
          <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <div className="text-sm">No images available</div>
        </div>
      </div>
    );
  }

  const handlePreviousImage = () => {
    setSelectedImageIndex((prev) => (prev - 1 + imageKeys.length) % imageKeys.length);
  };

  const handleNextImage = () => {
    setSelectedImageIndex((prev) => (prev + 1) % imageKeys.length);
  };

  const openModal = (index: number) => {
    setSelectedImageIndex(index);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  return (
    <div className={className}>
      {/* Main image display */}
      <div className="relative">
        <SecureImage
          propertyId={propertyId}
          imageKey={imageKeys[selectedImageIndex]}
          alt={`Property image ${selectedImageIndex + 1}`}
          className={`w-full h-64 object-cover cursor-pointer ${imageClassName}`}
          fallbackClassName={`w-full h-64 ${fallbackClassName}`}
          onClick={() => openModal(selectedImageIndex)}
        />
        
        {/* Navigation arrows */}
        {imageKeys.length > 1 && (
          <>
            <button
              onClick={handlePreviousImage}
              className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70"
              aria-label="Previous image"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={handleNextImage}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70"
              aria-label="Next image"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}
        
        {/* Image counter */}
        {imageKeys.length > 1 && (
          <div className="absolute bottom-2 right-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
            {selectedImageIndex + 1} / {imageKeys.length}
          </div>
        )}
      </div>

      {/* Thumbnail gallery */}
      {imageKeys.length > 1 && (
        <div className="flex gap-2 mt-2 overflow-x-auto">
          {imageKeys.map((imageKey, index) => (
            <button
              key={imageKey}
              onClick={() => {
                setSelectedImageIndex(index);
                openModal(index);
              }}
              className={`flex-shrink-0 relative ${index === selectedImageIndex ? 'ring-2 ring-blue-500' : ''}`}
            >
              <SecureImage
                propertyId={propertyId}
                imageKey={imageKey}
                alt={`Thumbnail ${index + 1}`}
                className="w-16 h-16 object-cover"
                fallbackClassName="w-16 h-16"
              />
            </button>
          ))}
        </div>
      )}

      {/* Modal for full-screen viewing */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center" onClick={closeModal}>
          <div className="relative max-w-4xl max-h-full p-4" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={closeModal}
              className="absolute top-2 right-2 text-white bg-black bg-opacity-50 p-2 rounded-full hover:bg-opacity-70"
              aria-label="Close modal"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <SecureImage
              propertyId={propertyId}
              imageKey={imageKeys[selectedImageIndex]}
              alt={`Property image ${selectedImageIndex + 1}`}
              className="max-w-full max-h-full object-contain"
              fallbackClassName="w-96 h-96"
            />
            
            {/* Modal navigation */}
            {imageKeys.length > 1 && (
              <>
                <button
                  onClick={handlePreviousImage}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white bg-black bg-opacity-50 p-3 rounded-full hover:bg-opacity-70"
                  aria-label="Previous image"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={handleNextImage}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white bg-black bg-opacity-50 p-3 rounded-full hover:bg-opacity-70"
                  aria-label="Next image"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

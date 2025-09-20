import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';

interface ImageUploadModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (imageUrl: string) => Promise<boolean>;
  currentImageUrl?: string;
  restaurantName?: string;
}

export const ImageUploadModal: React.FC<ImageUploadModalProps> = ({
  visible,
  onClose,
  onSubmit,
  currentImageUrl,
  restaurantName,
}) => {
  const [imageUrl, setImageUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewError, setPreviewError] = useState(false);

  const handleClose = () => {
    setImageUrl('');
    setPreviewError(false);
    onClose();
  };

  const handleSubmit = async () => {
    if (!imageUrl.trim()) {
      Alert.alert('Error', 'Please enter an image URL');
      return;
    }

    // Basic URL validation
    try {
      new URL(imageUrl);
    } catch {
      Alert.alert('Error', 'Please enter a valid URL');
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await onSubmit(imageUrl.trim());
      if (success) {
        Alert.alert('Success', 'Restaurant image updated successfully!');
        handleClose();
      } else {
        Alert.alert('Error', 'Failed to update restaurant image. Please try again.');
      }
    } catch (error) {
      console.error('Error updating image:', error);
      Alert.alert('Error', 'Failed to update restaurant image. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageError = () => {
    setPreviewError(true);
  };

  const handleImageLoad = () => {
    setPreviewError(false);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <TouchableOpacity onPress={handleClose} style={styles.cancelButton}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Update Image</Text>
            <TouchableOpacity
              onPress={handleSubmit}
              style={[styles.saveButton, isSubmitting && styles.saveButtonDisabled]}
              disabled={isSubmitting}
            >
              <Text style={[styles.saveText, isSubmitting && styles.saveTextDisabled]}>
                {isSubmitting ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            {restaurantName && (
              <Text style={styles.restaurantName}>{restaurantName}</Text>
            )}

            <Text style={styles.label}>Current Image:</Text>
            {currentImageUrl && (
              <Image source={{ uri: currentImageUrl }} style={styles.currentImage} />
            )}

            <Text style={styles.label}>New Image URL:</Text>
            <TextInput
              style={styles.input}
              value={imageUrl}
              onChangeText={setImageUrl}
              placeholder="https://example.com/restaurant-image.jpg"
              placeholderTextColor="#999"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
            />

            {imageUrl.trim() && (
              <View style={styles.previewContainer}>
                <Text style={styles.label}>Preview:</Text>
                {!previewError ? (
                  <Image
                    source={{ uri: imageUrl }}
                    style={styles.previewImage}
                    onError={handleImageError}
                    onLoad={handleImageLoad}
                  />
                ) : (
                  <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>
                      Failed to load image. Please check the URL.
                    </Text>
                  </View>
                )}
              </View>
            )}

            <View style={styles.tipsContainer}>
              <Text style={styles.tipsTitle}>Tips:</Text>
              <Text style={styles.tipText}>• Use direct image URLs (ending in .jpg, .png, etc.)</Text>
              <Text style={styles.tipText}>• Images from Unsplash, Imgur, or other image hosts work well</Text>
              <Text style={styles.tipText}>• Make sure the image is publicly accessible</Text>
              <Text style={styles.tipText}>• Your image will be shared with other users in this area</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  cancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  cancelText: {
    color: '#007AFF',
    fontSize: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  saveButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  saveTextDisabled: {
    color: '#999',
  },
  content: {
    padding: 20,
  },
  restaurantName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginBottom: 24,
    textAlign: 'center',
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    marginBottom: 8,
    marginTop: 16,
  },
  currentImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
    marginBottom: 16,
  },
  previewContainer: {
    marginTop: 8,
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
  },
  errorContainer: {
    width: '100%',
    height: 100,
    backgroundColor: '#ffebee',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ffcdd2',
  },
  errorText: {
    color: '#c62828',
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  tipsContainer: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#f0f7ff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e3f2fd',
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1565c0',
    marginBottom: 8,
  },
  tipText: {
    fontSize: 14,
    color: '#1976d2',
    marginBottom: 4,
  },
});
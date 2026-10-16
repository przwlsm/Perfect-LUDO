import { Platform } from 'react-native';
import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import type { IPhotoPicker, PickedPhoto } from '@/domain/ports/IPhotoPicker';

/**
 * The system photo picker. On Android 13+ and iOS 14+ it needs no
 * permission at all (the system picker hands over only the chosen photo).
 * The chosen photo is copied into the app's own folder so "My cards" can
 * redraw it later; nothing is ever uploaded.
 */
export class ExpoPhotoPicker implements IPhotoPicker {
  async pick(): Promise<PickedPhoto | null> {
    let result: ImagePicker.ImagePickerResult;
    try {
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.9,
        allowsMultipleSelection: false,
        exif: false,
      });
    } catch {
      return null;
    }
    const asset = result.canceled ? undefined : result.assets[0];
    if (!asset) return null;
    const picked = { uri: asset.uri, width: asset.width, height: asset.height };
    if (Platform.OS === 'web') return picked;
    try {
      const folder = new Directory(Paths.document, 'photos');
      if (!folder.exists) folder.create({ intermediates: true, idempotent: true });
      const ext = /\.(png|jpe?g|heic|webp)$/i.exec(asset.uri)?.[0] ?? '.jpg';
      const copy = new File(folder, `photo-${Date.now()}${ext.toLowerCase()}`);
      await new File(asset.uri).copy(copy);
      return { ...picked, uri: copy.uri };
    } catch {
      // The picker's own copy still works for this session.
      return picked;
    }
  }

  async discard(uri: string): Promise<void> {
    if (Platform.OS === 'web' || !uri.includes('/photos/photo-')) return;
    try {
      const file = new File(uri);
      if (file.exists) file.delete();
    } catch {
      // Already gone.
    }
  }
}

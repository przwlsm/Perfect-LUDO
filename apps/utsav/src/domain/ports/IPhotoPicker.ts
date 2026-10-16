export interface PickedPhoto {
  /** A uri the app can read again later (copied into the app's own folder on phones). */
  readonly uri: string;
  readonly width: number;
  readonly height: number;
}

/**
 * Lets the sender choose one photo from their library with the system
 * picker. Photos never leave the phone except inside a card they share.
 */
export interface IPhotoPicker {
  /** Null when the sender cancelled or the picker could not open. */
  pick(): Promise<PickedPhoto | null>;
  /** Deletes the app's own copy of a photo no card uses any more. Never rejects. */
  discard(uri: string): Promise<void>;
}

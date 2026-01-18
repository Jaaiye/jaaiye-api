/**
 * Firebase Adapter
 * Wraps Firebase Admin SDK for custom token generation
 * Infrastructure layer - external services
 */

const admin = require('firebase-admin');
const path = require('path');

class FirebaseAdapter {
  constructor() {
    this.initialized = false;
    this.initializeFirebase();
  }

  /**
   * Initialize Firebase Admin SDK
   * @private
   */
  initializeFirebase() {
    if (this.initialized) return;

    try {
      // Check if already initialized
      if (admin.apps.length > 0) {
        this.initialized = true;
        return;
      }

      // Validate required environment variables
      const requiredVars = [
        'FIREBASE_PROJECT_ID',
        'FIREBASE_PRIVATE_KEY',
        'FIREBASE_CLIENT_EMAIL'
      ];

      const missingVars = requiredVars.filter(varName => !process.env[varName]);
      if (missingVars.length > 0) {
        console.warn(`Firebase Admin not initialized: Missing environment variables: ${missingVars.join(', ')}`);
        return;
      }

      // Normalize private key - handle various formats from environment variables
      let privateKey = process.env.FIREBASE_PRIVATE_KEY || '';

      // Log initial state (sanitized for security)
      console.log('[Firebase Init] Private key initial state:', {
        length: privateKey.length,
        hasBeginHeader: privateKey.includes('BEGIN'),
        hasEndHeader: privateKey.includes('END'),
        hasNewlines: privateKey.includes('\n'),
        hasEscapedNewlines: privateKey.includes('\\n'),
        hasDoubleEscapedNewlines: privateKey.includes('\\\\n'),
        firstChars: privateKey.substring(0, 50).replace(/\n/g, '\\n').replace(/\\/g, '\\\\'),
        lastChars: privateKey.substring(Math.max(0, privateKey.length - 50)).replace(/\n/g, '\\n').replace(/\\/g, '\\\\')
      });

      // Handle multiple levels of escaping - order matters!
      // First, handle double-escaped (\\\\n -> \n) - this matches \\n in the actual string
      const beforeDoubleReplace = privateKey;
      privateKey = privateKey.replace(/\\\\n/g, '\n');
      if (beforeDoubleReplace !== privateKey) {
        const count = (beforeDoubleReplace.match(/\\\\n/g) || []).length;
        console.log(`[Firebase Init] Replaced double-escaped newlines (\\\\n -> \\n), count: ${count}`);
      }

      // Then handle single-escaped (\n -> \n) - this matches \n in the actual string
      const beforeReplace = privateKey;
      privateKey = privateKey.replace(/\\n/g, '\n');
      if (beforeReplace !== privateKey) {
        const count = (beforeReplace.match(/\\n/g) || []).length;
        console.log(`[Firebase Init] Replaced escaped newlines (\\n -> \\n), count: ${count}`);
      }

      // Clean up any trailing/leading backslashes that might remain (common issue with env vars)
      // This handles cases like "-----END PRIVATE KEY-----\\" where there's a trailing backslash
      const beforeBackslashCleanup = privateKey;
      privateKey = privateKey.replace(/\\+$/gm, ''); // Remove trailing backslashes from each line
      privateKey = privateKey.replace(/^\\+/gm, ''); // Remove leading backslashes from each line
      if (beforeBackslashCleanup !== privateKey) {
        console.log('[Firebase Init] Cleaned up trailing/leading backslashes');
        const firstLine = privateKey.split('\n')[0];
        const lastLine = privateKey.split('\n').pop();
        console.log('[Firebase Init] After cleanup - first line:', firstLine?.substring(0, 60));
        console.log('[Firebase Init] After cleanup - last line:', lastLine?.substring(Math.max(0, lastLine.length - 60)));
      }
      if (beforeBackslashCleanup !== privateKey) {
        console.log('[Firebase Init] Cleaned up trailing/leading backslashes');
      }

      // Ensure proper PEM format - add headers if missing
      const hasBeginHeader = privateKey.includes('BEGIN PRIVATE KEY') || privateKey.includes('BEGIN RSA PRIVATE KEY');
      const hasEndHeader = privateKey.includes('END PRIVATE KEY') || privateKey.includes('END RSA PRIVATE KEY');

      if (privateKey && !hasBeginHeader) {
        console.log('[Firebase Init] Missing BEGIN header, attempting to add...');
        const keyContent = privateKey.trim();
        if (keyContent.length > 0) {
          // Check if it's RSA or PKCS8 format based on content
          if (keyContent.includes('MII')) {
            // Likely PKCS8 format
            privateKey = `-----BEGIN PRIVATE KEY-----\n${keyContent}\n-----END PRIVATE KEY-----\n`;
            console.log('[Firebase Init] Added PKCS8 headers');
          } else {
            // Try RSA format
            privateKey = `-----BEGIN RSA PRIVATE KEY-----\n${keyContent}\n-----END RSA PRIVATE KEY-----\n`;
            console.log('[Firebase Init] Added RSA headers');
          }
        }
      }

      // Clean up any extra whitespace
      privateKey = privateKey.trim();

      // Log final state
      console.log('[Firebase Init] Private key after normalization:', {
        length: privateKey.length,
        hasBeginHeader: privateKey.includes('BEGIN'),
        hasEndHeader: privateKey.includes('END'),
        hasNewlines: privateKey.includes('\n'),
        newlineCount: (privateKey.match(/\n/g) || []).length,
        firstLine: privateKey.split('\n')[0],
        lastLine: privateKey.split('\n').pop(),
        lineCount: privateKey.split('\n').length
      });

      const serviceAccount = {
        type: "service_account",
        project_id: process.env.FIREBASE_PROJECT_ID,
        private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
        private_key: privateKey,
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        client_id: process.env.FIREBASE_CLIENT_ID,
        auth_uri: "https://accounts.google.com/o/oauth2/auth",
        token_uri: "https://oauth2.googleapis.com/token",
        auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
        client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
        universe_domain: "googleapis.com"
      };

      // Validate service account data
      if (!serviceAccount.project_id || !serviceAccount.private_key || !serviceAccount.client_email) {
        console.warn('Firebase Admin not initialized: Invalid service account configuration');
        if (!serviceAccount.private_key) {
          console.warn('FIREBASE_PRIVATE_KEY is missing or empty');
        }
        return;
      }

      // Validate private key format
      if (!serviceAccount.private_key.includes('BEGIN') || !serviceAccount.private_key.includes('END')) {
        console.error('Firebase Admin not initialized: Private key appears to be malformed');
        console.error('Private key should include -----BEGIN PRIVATE KEY----- and -----END PRIVATE KEY----- headers');
        return;
      }

      // Initialize Firebase Admin with better error handling
      try {
        console.log('[Firebase Init] Attempting to initialize Firebase Admin...');
        console.log('[Firebase Init] Service account config:', {
          project_id: serviceAccount.project_id,
          client_email: serviceAccount.client_email,
          private_key_id: serviceAccount.private_key_id ? 'present' : 'missing',
          private_key_length: serviceAccount.private_key?.length || 0,
          private_key_has_headers: serviceAccount.private_key?.includes('BEGIN') && serviceAccount.private_key?.includes('END')
        });

        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          projectId: serviceAccount.project_id
        });

        console.log('[Firebase Init] Firebase Admin initialized successfully');
      } catch (initError) {
        // Log detailed error information
        console.error('[Firebase Init] Initialization failed with error:', {
          name: initError.name,
          message: initError.message,
          code: initError.code,
          stack: initError.stack?.split('\n').slice(0, 5).join('\n')
        });

        // Provide more helpful error messages
        if (initError.message && (initError.message.includes('PEM') || initError.message.includes('private key'))) {
          console.error('[Firebase Init] PEM Format Error Details:');
          console.error('Error:', initError.message);
          console.error('Private key state:', {
            length: serviceAccount.private_key?.length || 0,
            isEmpty: !serviceAccount.private_key || serviceAccount.private_key.length === 0,
            hasBeginHeader: serviceAccount.private_key?.includes('BEGIN') || false,
            hasEndHeader: serviceAccount.private_key?.includes('END') || false,
            hasNewlines: serviceAccount.private_key?.includes('\n') || false,
            firstLine: serviceAccount.private_key?.split('\n')[0] || 'N/A',
            lastLine: serviceAccount.private_key?.split('\n').pop() || 'N/A',
            lineCount: serviceAccount.private_key?.split('\n').length || 0
          });
          console.error('Common issues:');
          console.error('1. Private key may have incorrect newline formatting');
          console.error('2. Private key may be missing BEGIN/END headers');
          console.error('3. Environment variable may have encoding issues');
          console.error('4. Private key may be corrupted or truncated');
          console.error('Tip: Ensure FIREBASE_PRIVATE_KEY includes the full key with headers');
          console.error('Expected format:');
          console.error('-----BEGIN PRIVATE KEY-----');
          console.error('(base64 encoded key content)');
          console.error('-----END PRIVATE KEY-----');
        } else {
          console.error('[Firebase Init] Non-PEM error, re-throwing...');
          throw initError; // Re-throw if it's not a PEM error
        }
        this.initialized = false;
        return;
      }

      // Verify messaging is available (FCM V1 API)
      try {
        const messaging = admin.messaging();
        if (!messaging) {
          console.warn('Firebase Messaging not available - ensure Firebase Cloud Messaging API (V1) is enabled in Google Cloud Console');
        } else {
          console.log('Firebase Admin initialized successfully with FCM V1 support');
        }
      } catch (error) {
        console.warn('Firebase Messaging check failed:', error.message);
        console.warn('Ensure Firebase Cloud Messaging API (V1) is enabled in Google Cloud Console');
      }

      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize Firebase Admin:', error.message);
      // Don't throw - allow app to run without Firebase
      this.initialized = false;
    }
  }

  /**
   * Generate custom Firebase token for user
   * @param {string} userId - User ID
   * @returns {Promise<string>} Firebase custom token
   */
  async generateToken(userId) {
    if (!this.initialized) {
      console.warn('Firebase not initialized, returning null token');
      return null;
    }

    try {
      const customToken = await admin.auth().createCustomToken(userId);
      return customToken;
    } catch (error) {
      console.error('Failed to generate Firebase token:', error.message);
      // Return null instead of throwing - graceful degradation
      return null;
    }
  }

  /**
   * Verify Firebase ID token
   * @param {string} idToken - Firebase ID token
   * @returns {Promise<Object>} Decoded token
   */
  async verifyIdToken(idToken) {
    if (!this.initialized) {
      throw new Error('Firebase not initialized');
    }

    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      return decodedToken;
    } catch (error) {
      throw new Error(`Invalid Firebase token: ${error.message}`);
    }
  }

  /**
   * Send multicast message to multiple device tokens (FCM)
   * @param {string[]} tokens - Array of FCM device tokens
   * @param {Object} notification - { title, body }
   * @param {Object} data - Additional data payload
   * @returns {Promise<Object>} Response with successCount, failureCount, responses
   */
  async sendMulticastMessage(tokens, notification, data = {}) {
    if (!this.initialized) {
      console.warn('Firebase not initialized, skipping multicast message');
      return { successCount: 0, failureCount: tokens?.length || 0, responses: [] };
    }

    try {
      if (!tokens || tokens.length === 0) {
        return { successCount: 0, failureCount: 0, responses: [] };
      }

      // Validate that messaging is available (FCM V1 API)
      if (!admin.messaging) {
        console.error('Firebase messaging not available - Firebase Cloud Messaging API (V1) may not be enabled for this project');
        console.error('Please enable Firebase Cloud Messaging API (V1) in Google Cloud Console:');
        console.error(`https://console.cloud.google.com/apis/library/fcm.googleapis.com?project=${process.env.FIREBASE_PROJECT_ID}`);
        return { successCount: 0, failureCount: tokens.length, responses: [] };
      }

      const message = {
        notification: {
          title: notification.title,
          body: notification.body,
        },
        data: this._serializeData(data),
        tokens,
      };

      // Log request details before sending
      console.log('[Firebase] Sending multicast message', {
        tokenCount: tokens.length,
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL
      });

      const response = await admin.messaging().sendEachForMulticast(message);
      console.log(`Firebase message sent: ${response.successCount} success, ${response.failureCount} failed`);

      return response;
    } catch (error) {
      // Log detailed error information for debugging
      const errorDetails = {
        code: error.code,
        message: error.message,
        statusCode: error.httpResponse?.statusCode,
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        hasMessaging: !!admin.messaging,
        errorType: error.constructor?.name,
        httpResponse: error.httpResponse ? {
          statusCode: error.httpResponse.statusCode,
          statusText: error.httpResponse.statusText,
          headers: error.httpResponse.headers,
          body: typeof error.httpResponse.body === 'string'
            ? error.httpResponse.body.substring(0, 500)
            : error.httpResponse.body
        } : null
      };

      // Check if this is the 404 /batch error
      if (error.message?.includes('/batch') || error.message?.includes('404') || error.httpResponse?.statusCode === 404) {
        console.error('Firebase sendMulticastMessage - 404 /batch error detected:', {
          ...errorDetails,
          troubleshooting: [
            '1. Verify FCM API is enabled: https://console.cloud.google.com/apis/library/fcm.googleapis.com?project=' + process.env.FIREBASE_PROJECT_ID,
            '2. Check service account has "Firebase Cloud Messaging Admin" role: https://console.cloud.google.com/iam-admin/iam?project=' + process.env.FIREBASE_PROJECT_ID,
            '3. Verify service account email matches: ' + process.env.FIREBASE_CLIENT_EMAIL,
            '4. Check for network/proxy issues that might intercept Firebase API calls',
            '5. Wait a few minutes after enabling API - propagation can take time'
          ],
          apiUrl: `https://console.cloud.google.com/apis/library/fcm.googleapis.com?project=${process.env.FIREBASE_PROJECT_ID}`,
          iamUrl: `https://console.cloud.google.com/iam-admin/iam?project=${process.env.FIREBASE_PROJECT_ID}`
        });
      } else {
        console.error('Firebase sendMulticastMessage error:', errorDetails);
      }

      // Handle specific Firebase errors gracefully
      if (error.code === 'messaging/unknown-error' || error.code === 'messaging/invalid-argument') {
        // Return a response indicating failure but don't throw
        return {
          successCount: 0,
          failureCount: tokens?.length || 0,
          responses: [],
          error: error.message
        };
      }

      // For other errors, still return gracefully
      return {
        successCount: 0,
        failureCount: tokens?.length || 0,
        responses: [],
        error: error.message
      };
    }
  }

  /**
   * Send single message to one device token (FCM)
   * @param {string} token - FCM device token
   * @param {Object} notification - { title, body }
   * @param {Object} data - Additional data payload
   * @returns {Promise<Object>} Firebase response
   */
  async sendSingleMessage(token, notification, data = {}) {
    if (!this.initialized) {
      console.warn('Firebase not initialized, skipping single message');
      return null;
    }

    try {
      // Validate that messaging is available (FCM V1 API)
      if (!admin.messaging) {
        console.error('Firebase messaging not available - Firebase Cloud Messaging API (V1) may not be enabled for this project');
        console.error('Please enable Firebase Cloud Messaging API (V1) in Google Cloud Console:');
        console.error(`https://console.cloud.google.com/apis/library/fcm.googleapis.com?project=${process.env.FIREBASE_PROJECT_ID}`);
        return null;
      }

      const message = {
        notification: {
          title: notification.title,
          body: notification.body,
        },
        data: this._serializeData(data),
        token,
      };

      const response = await admin.messaging().send(message);
      console.log('Firebase single message sent successfully');

      return response;
    } catch (error) {
      // Handle specific Firebase errors gracefully
      if (error.code === 'messaging/unknown-error' || error.code === 'messaging/invalid-argument') {
        console.error('Firebase sendSingleMessage error:', error.message);
        return null;
      }
      console.error('Firebase sendSingleMessage error:', error);
      return null;
    }
  }

  /**
   * Serialize data object to string values (FCM requirement)
   * @private
   */
  _serializeData(data) {
    const serialized = {};
    for (const [key, value] of Object.entries(data)) {
      // FCM data must be strings
      serialized[key] = typeof value === 'string' ? value : JSON.stringify(value);
    }
    return serialized;
  }

  // ============================================================================
  // FIRESTORE METHODS (for Group functionality)
  // ============================================================================

  /**
   * Safe conversion of IDs to hex strings to avoid binary buffer mangling
   * @private
   */
  _safeToString(id) {
    if (!id) return '';
    if (typeof id === 'string') return id;
    if (id.toHexString) return id.toHexString();
    if (Buffer.isBuffer(id)) return id.toString('hex');
    if (id._id) return this._safeToString(id._id);
    return String(id);
  }

  /**
   * Helper to sanitize values for Firestore
   * @private
   */
  _sanitizeValue(value) {
    if (value === null || value === undefined) return '';
    if (typeof value === 'object' && !Array.isArray(value)) {
      // Handle Firebase FieldValues
      if (value.constructor?.name === 'FieldValue') return value;

      // Handle profile picture objects (emoji + color)
      if (value.emoji || value.backgroundColor) {
        return {
          emoji: String(value.emoji || ''),
          color: String(value.backgroundColor || '')
        };
      }

      // Attempt to get a plain object if it's not one already
      try {
        if (value.toObject) return value.toObject();
        // Fallback for other objects - ensure they are plain
        return JSON.parse(JSON.stringify(value));
      } catch (e) {
        return String(value);
      }
    }
    return value;
  }

  /**
   * Create a group in Firestore
   * @param {string} groupId - Group ID
   * @param {Object} groupData - Group data
   * @returns {Promise<Object>} Success response
   */
  async createGroup(groupId, groupData) {
    if (!this.initialized) {
      throw new Error('Firebase not initialized');
    }

    try {
      // Ensure all values are serializable primitives
      const sanitizedData = {
        name: String(groupData.name || ''),
        description: String(groupData.description || ''),
        creator: this._safeToString(groupData.creator),
        members: {},
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      // Sanitize members object
      if (groupData.members && typeof groupData.members === 'object') {
        for (const [key, value] of Object.entries(groupData.members)) {
          sanitizedData.members[this._safeToString(key)] = {
            name: String(value.name || 'Unknown User'),
            avatar: this._sanitizeValue(value.avatar),
            role: String(value.role || 'member')
          };
        }
      }

      await admin.firestore()
        .collection('groups')
        .doc(String(groupId))
        .set(sanitizedData);

      console.log(`Group created in Firebase: ${groupId}`);
      return { success: true, id: groupId };
    } catch (error) {
      console.error('Firebase createGroup error:', error);
      throw new Error('Failed to create group in Firebase');
    }
  }

  /**
   * Get group snapshot from Firestore
   * @param {string} groupId - Group ID
   * @returns {Promise<Object|null>} Group data or null
   */
  async getGroupSnapshot(groupId) {
    if (!this.initialized) {
      return null;
    }

    try {
      const doc = await admin.firestore().collection('groups').doc(groupId.toString()).get();
      return doc.exists ? doc.data() : null;
    } catch (error) {
      console.error('Firebase getGroupSnapshot error:', error);
      return null;
    }
  }

  /**
   * Update group in Firestore
   * @param {string} groupId - Group ID
   * @param {Object} updates - Update data
   * @returns {Promise<void>}
   */
  async updateGroup(groupId, updates) {
    if (!this.initialized) {
      throw new Error('Firebase not initialized');
    }

    try {
      const sanitizedUpdates = {};
      for (const [key, value] of Object.entries(updates)) {
        if (key === 'updatedAt') {
          sanitizedUpdates[key] = admin.firestore.FieldValue.serverTimestamp();
        } else if (key === 'members' && typeof value === 'object' && value !== null) {
          // Special handling for members to keep the structure
          sanitizedUpdates.members = {};
          for (const [memberId, memberData] of Object.entries(value)) {
            sanitizedUpdates.members[memberId] = {
              name: String(memberData.name || 'Unknown User'),
              avatar: this._sanitizeValue(memberData.avatar),
              role: String(memberData.role || 'member')
            };
          }
        } else {
          sanitizedUpdates[key] = this._sanitizeValue(value);
        }
      }

      await admin.firestore().collection('groups').doc(groupId.toString()).update(sanitizedUpdates);
    } catch (error) {
      console.error('Firebase updateGroup error:', error);
      throw new Error('Failed to update group in Firebase');
    }
  }

  /**
   * Delete group from Firestore
   * @param {string} groupId - Group ID
   * @returns {Promise<void>}
   */
  async deleteGroup(groupId) {
    if (!this.initialized) {
      throw new Error('Firebase not initialized');
    }

    try {
      await admin.firestore().collection('groups').doc(groupId.toString()).delete();
      console.log(`Group deleted from Firebase: ${groupId}`);
    } catch (error) {
      console.error('Firebase deleteGroup error:', error);
      throw new Error('Failed to delete group from Firebase');
    }
  }

  /**
   * Add member to group in Firestore
   * @param {string} groupId - Group ID
   * @param {Object} memberData - Member data
   * @returns {Promise<void>}
   */
  async addMember(groupId, memberData) {
    if (!this.initialized) {
      throw new Error('Firebase not initialized');
    }

    try {
      await admin.firestore().collection('groups').doc(groupId).update({
        [`members.${this._safeToString(memberData.id)}`]: {
          name: String(memberData.name || 'Unknown User'),
          avatar: this._sanitizeValue(memberData.avatar),
          role: String(memberData.role || 'member')
        },
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    } catch (error) {
      console.error('Firebase addMember error:', error);
      throw error;
    }
  }

  /**
   * Remove member from group in Firestore
   * @param {string} groupId - Group ID
   * @param {string} memberId - Member ID
   * @returns {Promise<void>}
   */
  async removeMember(groupId, memberId) {
    if (!this.initialized) {
      throw new Error('Firebase not initialized');
    }

    try {
      await admin.firestore().collection('groups').doc(groupId).update({
        [`members.${memberId}`]: admin.firestore.FieldValue.delete(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    } catch (error) {
      console.error('Firebase removeMember error:', error);
      throw error;
    }
  }
}

module.exports = FirebaseAdapter;


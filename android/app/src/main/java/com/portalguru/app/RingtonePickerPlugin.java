package com.portalguru.app;

import android.content.ContentResolver;
import android.content.Intent;
import android.database.Cursor;
import android.media.RingtoneManager;
import android.net.Uri;
import android.provider.MediaStore;

import androidx.activity.result.ActivityResult;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONException;

/**
 * Capacitor Plugin for accessing Android system ringtones
 * 
 * Provides methods to:
 * - Get list of available notification/ringtone sounds
 * - Play a preview of a selected sound
 * - Open the system ringtone picker
 * - Get the selected ringtone URI
 */
@CapacitorPlugin(name = "RingtonePicker")
public class RingtonePickerPlugin extends Plugin {

    private static final int RINGTONE_PICKER_REQUEST = 1001;
    private android.media.Ringtone currentlyPlayingRingtone;
    private PluginCall savedCall;

    /**
     * Get list of all available notification sounds from the system
     */
    @PluginMethod
    public void getNotificationSounds(PluginCall call) {
        try {
            JSArray sounds = new JSArray();
            
            RingtoneManager manager = new RingtoneManager(getActivity());
            manager.setType(RingtoneManager.TYPE_NOTIFICATION);
            Cursor cursor = manager.getCursor();
            
            while (cursor.moveToNext()) {
                JSObject sound = new JSObject();
                String title = cursor.getString(RingtoneManager.TITLE_COLUMN_INDEX);
                String uri = manager.getRingtoneUri(cursor.getPosition()).toString();
                
                sound.put("id", cursor.getPosition());
                sound.put("title", title);
                sound.put("uri", uri);
                sound.put("type", "notification");
                
                sounds.put(sound);
            }
            
            // Also add default notification sound
            JSObject defaultSound = new JSObject();
            Uri defaultUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
            if (defaultUri != null) {
                defaultSound.put("id", -1);
                defaultSound.put("title", "Default");
                defaultSound.put("uri", defaultUri.toString());
                defaultSound.put("type", "notification");
                defaultSound.put("isDefault", true);
            }
            
            JSObject result = new JSObject();
            result.put("sounds", sounds);
            result.put("defaultSound", defaultSound);
            
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Failed to get notification sounds: " + e.getMessage());
        }
    }

    /**
     * Get list of all available ringtones
     */
    @PluginMethod
    public void getRingtones(PluginCall call) {
        try {
            JSArray sounds = new JSArray();
            
            RingtoneManager manager = new RingtoneManager(getActivity());
            manager.setType(RingtoneManager.TYPE_RINGTONE);
            Cursor cursor = manager.getCursor();
            
            while (cursor.moveToNext()) {
                JSObject sound = new JSObject();
                String title = cursor.getString(RingtoneManager.TITLE_COLUMN_INDEX);
                String uri = manager.getRingtoneUri(cursor.getPosition()).toString();
                
                sound.put("id", cursor.getPosition());
                sound.put("title", title);
                sound.put("uri", uri);
                sound.put("type", "ringtone");
                
                sounds.put(sound);
            }
            
            JSObject result = new JSObject();
            result.put("sounds", sounds);
            
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Failed to get ringtones: " + e.getMessage());
        }
    }

    /**
     * Preview a sound by its URI
     */
    @PluginMethod
    public void previewSound(PluginCall call) {
        String uriString = call.getString("uri");
        
        if (uriString == null || uriString.isEmpty()) {
            call.reject("URI is required");
            return;
        }
        
        try {
            // Stop any currently playing ringtone
            stopCurrentPreview();
            
            Uri uri = Uri.parse(uriString);
            currentlyPlayingRingtone = RingtoneManager.getRingtone(getActivity(), uri);
            
            if (currentlyPlayingRingtone != null) {
                currentlyPlayingRingtone.play();
                call.resolve();
            } else {
                call.reject("Could not get ringtone for URI");
            }
        } catch (Exception e) {
            call.reject("Failed to preview sound: " + e.getMessage());
        }
    }

    /**
     * Stop current preview playback
     */
    @PluginMethod
    public void stopPreview(PluginCall call) {
        stopCurrentPreview();
        call.resolve();
    }

    /**
     * Open the system ringtone picker dialog
     */
    @PluginMethod
    public void openPicker(PluginCall call) {
        this.savedCall = call;
        
        String type = call.getString("type", "notification");
        String currentUri = call.getString("currentUri");
        String title = call.getString("title", "Pilih Nada Notifikasi");
        
        Intent intent = new Intent(RingtoneManager.ACTION_RINGTONE_PICKER);
        
        // Set ringtone type
        if ("ringtone".equals(type)) {
            intent.putExtra(RingtoneManager.EXTRA_RINGTONE_TYPE, RingtoneManager.TYPE_RINGTONE);
        } else if ("alarm".equals(type)) {
            intent.putExtra(RingtoneManager.EXTRA_RINGTONE_TYPE, RingtoneManager.TYPE_ALARM);
        } else {
            intent.putExtra(RingtoneManager.EXTRA_RINGTONE_TYPE, RingtoneManager.TYPE_NOTIFICATION);
        }
        
        intent.putExtra(RingtoneManager.EXTRA_RINGTONE_TITLE, title);
        intent.putExtra(RingtoneManager.EXTRA_RINGTONE_SHOW_SILENT, true);
        intent.putExtra(RingtoneManager.EXTRA_RINGTONE_SHOW_DEFAULT, true);
        
        // Set current selection if provided
        if (currentUri != null && !currentUri.isEmpty()) {
            intent.putExtra(RingtoneManager.EXTRA_RINGTONE_EXISTING_URI, Uri.parse(currentUri));
        }
        
        startActivityForResult(call, intent, "handleRingtonePickerResult");
    }

    /**
     * Handle result from ringtone picker activity
     */
    @ActivityCallback
    private void handleRingtonePickerResult(PluginCall call, ActivityResult result) {
        if (result.getResultCode() == android.app.Activity.RESULT_OK) {
            Intent data = result.getData();
            if (data != null) {
                Uri uri = data.getParcelableExtra(RingtoneManager.EXTRA_RINGTONE_PICKED_URI);
                
                JSObject response = new JSObject();
                
                if (uri != null) {
                    response.put("uri", uri.toString());
                    
                    // Get the title of the selected ringtone
                    android.media.Ringtone ringtone = RingtoneManager.getRingtone(getActivity(), uri);
                    if (ringtone != null) {
                        response.put("title", ringtone.getTitle(getActivity()));
                    }
                    
                    response.put("cancelled", false);
                } else {
                    // User selected "Silent"
                    response.put("uri", null);
                    response.put("title", "Diam");
                    response.put("cancelled", false);
                    response.put("isSilent", true);
                }
                
                call.resolve(response);
            } else {
                call.reject("No data returned from picker");
            }
        } else {
            // User cancelled the picker
            JSObject response = new JSObject();
            response.put("cancelled", true);
            call.resolve(response);
        }
    }

    /**
     * Get the default notification sound URI
     */
    @PluginMethod
    public void getDefaultSound(PluginCall call) {
        try {
            Uri defaultUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
            
            JSObject result = new JSObject();
            
            if (defaultUri != null) {
                result.put("uri", defaultUri.toString());
                
                android.media.Ringtone ringtone = RingtoneManager.getRingtone(getActivity(), defaultUri);
                if (ringtone != null) {
                    result.put("title", ringtone.getTitle(getActivity()));
                }
            }
            
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Failed to get default sound: " + e.getMessage());
        }
    }

    /**
     * Helper method to stop currently playing preview
     */
    private void stopCurrentPreview() {
        if (currentlyPlayingRingtone != null && currentlyPlayingRingtone.isPlaying()) {
            currentlyPlayingRingtone.stop();
        }
        currentlyPlayingRingtone = null;
    }

    /**
     * Clean up when plugin is destroyed
     */
    @Override
    protected void handleOnDestroy() {
        stopCurrentPreview();
        super.handleOnDestroy();
    }
}

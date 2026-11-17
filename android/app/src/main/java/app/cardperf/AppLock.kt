package app.cardperf

import androidx.biometric.BiometricManager
import androidx.biometric.BiometricManager.Authenticators.BIOMETRIC_WEAK
import androidx.biometric.BiometricManager.Authenticators.DEVICE_CREDENTIAL
import androidx.biometric.BiometricPrompt
import androidx.core.content.ContextCompat
import androidx.fragment.app.FragmentActivity

/**
 * Locks the app screen behind the phone's own fingerprint/face/PIN/pattern.
 * The notification listener runs in its own service and is not affected.
 *
 * `locked` starts true, becomes false only after a successful prompt, and goes back to true whenever the
 * activity stops (leaving the app, screen off). Leaving for the system PIN screen during a prompt is ignored.
 */
class AppLock(private val activity: FragmentActivity, private val onChange: (locked: Boolean) -> Unit) {
    var locked = true
        private set
    private var authenticating = false

    /** Fingerprint/face if enrolled, otherwise (or as fallback) the phone's PIN, pattern or password. */
    private val authenticators = BIOMETRIC_WEAK or DEVICE_CREDENTIAL

    fun lock() {
        if (authenticating) return
        locked = true
        onChange(true)
    }

    /** Screen off always locks, even mid-prompt (the prompt is dismissed by the system anyway). */
    fun forceLock() {
        authenticating = false
        locked = true
        onChange(true)
    }

    fun promptIfLocked() {
        if (!locked || authenticating) return
        // No screen lock set up on the phone: there is nothing to check against, so don't trap the user.
        if (BiometricManager.from(activity).canAuthenticate(authenticators) != BiometricManager.BIOMETRIC_SUCCESS) {
            unlock()
            return
        }
        authenticating = true
        val prompt = BiometricPrompt(activity, ContextCompat.getMainExecutor(activity), object : BiometricPrompt.AuthenticationCallback() {
            override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                authenticating = false
                unlock()
            }

            override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
                authenticating = false // stay locked; the cover's button tries again
            }
        })
        prompt.authenticate(
            BiometricPrompt.PromptInfo.Builder()
                .setTitle("카드 실적 잠금 해제")
                .setSubtitle("지문이나 화면 잠금으로 열어요")
                .setAllowedAuthenticators(authenticators)
                .build(),
        )
    }

    private fun unlock() {
        locked = false
        onChange(false)
    }
}

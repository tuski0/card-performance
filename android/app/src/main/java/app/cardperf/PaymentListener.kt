package app.cardperf

import android.app.Notification
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log
import androidx.work.BackoffPolicy
import androidx.work.Constraints
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import java.util.concurrent.TimeUnit

class PaymentListener : NotificationListenerService() {
    override fun onNotificationPosted(sbn: StatusBarNotification) {
        val pkg = sbn.packageName ?: return
        if (pkg == packageName) return
        val n = sbn.notification ?: return
        if (n.flags and Notification.FLAG_GROUP_SUMMARY != 0) return
        if (n.flags and Notification.FLAG_ONGOING_EVENT != 0) return

        val prefs = Prefs(this)
        val allowed = prefs.allowedPackages
        if (!NoticeFilter.isAllowedSource(pkg, allowed)) {
            // Debug aid: reveal real package ids of payment-looking notices. For non-allowlisted packages the text
            // is extracted in memory only to test the payment regex and take its length; it is never stored, logged or sent.
            val text = extractText(n)
            if (NoticeFilter.looksLikePayment(text)) Log.i("CardPerf", "unlisted payment-like notice: pkg=$pkg len=${text.length}")
            return
        }
        val text = extractText(n)
        if (!NoticeFilter.shouldForward(pkg, text, allowed)) return

        // Check the token first: a notice that arrives before the phone is connected must not be marked seen.
        if (prefs.token == null) return
        val whenMs = if (n.`when` > 0) n.`when` else sbn.postTime
        val key = NoticeFilter.keyOf(pkg, sbn.key ?: "", whenMs, text)
        val recent = prefs.recentKeys
        if (key in recent) return
        prefs.recentKeys = recent + key

        val request = OneTimeWorkRequestBuilder<IngestWorker>()
            .setInputData(IngestWorker.input(NoticeFilter.safeTake(text, MAX_TEXT), pkg, sbn.postTime, key))
            .setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
            .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS)
            .build()
        WorkManager.getInstance(applicationContext).enqueue(request)
    }

    private fun extractText(n: Notification): String {
        val e = n.extras
        val title = e.getCharSequence(Notification.EXTRA_TITLE)?.toString().orEmpty()
        val body = (e.getCharSequence(Notification.EXTRA_BIG_TEXT) ?: e.getCharSequence(Notification.EXTRA_TEXT))
            ?.toString().orEmpty()
        return "$title\n$body"
    }

    companion object {
        private const val MAX_TEXT = 2000
    }
}

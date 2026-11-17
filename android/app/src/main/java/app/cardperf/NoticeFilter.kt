package app.cardperf

import java.security.MessageDigest

/**
 * Candidate card/bank/SMS apps whose notifications may be forwarded.
 * UNVERIFIED best-known ids: Task 6 confirms them on the phone via `adb logcat | grep CardPerf`
 * (the listener logs the package of payment-looking notices from non-allowlisted apps).
 */
val DEFAULT_ALLOWED: Set<String> = setOf(
    "com.kbcard.cxh.appcard",          // KB Pay
    "com.kbstar.kbbank",               // KB국민 스타뱅킹
    "com.kbstar.reboot",               // KB 리브
    "viva.republica.toss",             // Toss
    "com.tossbank.app",                // Toss Bank (unverified)
    "com.samsung.android.messaging",   // Samsung Messages (SMS card notices)
    "com.google.android.apps.messaging", // Google Messages (SMS card notices)
)

object NoticeFilter {
    private val AMOUNT = Regex("""\d[\d,]*\s*원""")
    private val KEYWORD = Regex("승인|결제|사용|취소")

    fun looksLikePayment(text: String): Boolean = AMOUNT.containsMatchIn(text) && KEYWORD.containsMatchIn(text)

    fun isAllowedSource(pkg: String, allowed: Set<String>): Boolean = pkg in allowed

    /** Pure decision: only allowlisted packages are ever considered, then the text must look like a payment. */
    fun shouldForward(pkg: String, text: String, allowed: Set<String>): Boolean =
        isAllowedSource(pkg, allowed) && looksLikePayment(text)

    /** Cuts to at most [max] chars without leaving a lone high surrogate at the end. */
    fun safeTake(text: String, max: Int): String {
        if (text.length <= max) return text
        val end = if (max > 0 && Character.isHighSurrogate(text[max - 1])) max - 1 else max
        return text.substring(0, end)
    }

    /** sha256 hex of the event identity; length-prefixed so fields cannot be shifted across separators. */
    fun keyOf(pkg: String, sbnKey: String, whenMs: Long, text: String): String {
        val raw = listOf(pkg, sbnKey, whenMs.toString(), text).joinToString("") { "${it.length}:$it|" }
        return MessageDigest.getInstance("SHA-256").digest(raw.toByteArray(Charsets.UTF_8))
            .joinToString("") { "%02x".format(it) }
    }
}

package app.cardperf

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.Data
import androidx.work.WorkerParameters
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

/** Uploads one notice. The key is created once by the listener and reused on every retry. */
class IngestWorker(ctx: Context, params: WorkerParameters) : CoroutineWorker(ctx, params) {
    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        val token = Prefs(applicationContext).token ?: return@withContext Result.failure()
        val text = inputData.getString(TEXT) ?: return@withContext Result.failure()
        val pkg = inputData.getString(PACKAGE) ?: return@withContext Result.failure()
        val key = inputData.getString(KEY) ?: return@withContext Result.failure()
        val postedAt = inputData.getLong(POSTED_AT, 0L)
        val body = JSONObject().put("text", text).put("package", pkg).put("postedAt", postedAt).put("key", key)
        var conn: HttpURLConnection? = null
        try {
            conn = (URL(ENDPOINT).openConnection() as HttpURLConnection).apply {
                requestMethod = "POST"
                connectTimeout = 15_000
                readTimeout = 20_000
                doOutput = true
                setRequestProperty("Content-Type", "application/json; charset=utf-8")
                setRequestProperty("Authorization", "Bearer $token")
            }
            conn.outputStream.use { it.write(body.toString().toByteArray(Charsets.UTF_8)) }
            val code = conn.responseCode
            when {
                code in 200..299 -> Result.success()
                code in FINAL_CODES -> Result.failure() // no retry; 401 likely means disconnected
                else -> retryOrGiveUp()
            }
        } catch (e: Exception) {
            retryOrGiveUp()
        } finally {
            conn?.disconnect()
        }
    }

    private fun retryOrGiveUp(): Result = if (runAttemptCount >= MAX_ATTEMPTS) Result.failure() else Result.retry()

    companion object {
        const val MAX_ATTEMPTS = 8
        private val FINAL_CODES = setOf(400, 401, 403, 404, 413)
        const val ENDPOINT = "https://card-performance.vercel.app/api/ingest"
        const val TEXT = "text"
        const val PACKAGE = "package"
        const val POSTED_AT = "postedAt"
        const val KEY = "key"

        fun input(text: String, pkg: String, postedAt: Long, key: String): Data = Data.Builder()
            .putString(TEXT, text).putString(PACKAGE, pkg).putLong(POSTED_AT, postedAt).putString(KEY, key).build()
    }
}

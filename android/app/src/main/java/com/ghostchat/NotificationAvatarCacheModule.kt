package com.ghostchat

import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.net.Uri
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.Person
import androidx.core.graphics.drawable.IconCompat
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import okhttp3.OkHttpClient
import okhttp3.Request
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.io.IOException
import java.net.URI
import java.security.MessageDigest
import java.util.concurrent.TimeUnit

class NotificationAvatarCacheModule(
  private val reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {
  override fun getName() = "NotificationAvatarCache"

  @ReactMethod
  fun displayMessageNotification(options: ReadableMap, promise: Promise) {
    try {
      val title = options.getString("title")?.takeIf { it.isNotBlank() }
        ?: throw IllegalArgumentException("Missing notification title")
      val body = options.getString("body")?.takeIf { it.isNotBlank() }
        ?: throw IllegalArgumentException("Missing notification body")
      val channelId = options.getString("channelId")?.takeIf { it.isNotBlank() }
        ?: throw IllegalArgumentException("Missing notification channel")
      val messageId = options.getString("id")?.takeIf { it.isNotBlank() }
        ?: System.currentTimeMillis().toString()
      val actorId = options.getString("actorId")?.takeIf { it.isNotBlank() } ?: title
      val smallIconName = options.getString("smallIcon")
        ?: throw IllegalArgumentException("Missing notification small icon")
      val defaultAvatarName = options.getString("defaultAvatar")
        ?: throw IllegalArgumentException("Missing default avatar")
      val smallIconId = reactContext.resources.getIdentifier(
        smallIconName,
        "drawable",
        reactContext.packageName,
      )
      val defaultAvatarId = reactContext.resources.getIdentifier(
        defaultAvatarName,
        "drawable",
        reactContext.packageName,
      )
      require(smallIconId != 0 && defaultAvatarId != 0) {
        "Notification icon resource is unavailable"
      }

      val avatarUri = if (options.hasKey("avatarUri") && !options.isNull("avatarUri")) {
        options.getString("avatarUri")
      } else {
        null
      }
      val bitmap = avatarUri?.let { uri ->
        try {
          decodeCachedAvatar(uri)
        } catch (_: Exception) {
          Log.w(NOTIFICATION_TAG, "Avatar bitmap decode failed")
          null
        }
      }
      val httpStatus = if (options.hasKey("httpStatus") && !options.isNull("httpStatus")) {
        options.getInt("httpStatus").toString()
      } else {
        "unavailable"
      }
      val contentType = if (options.hasKey("contentType") && !options.isNull("contentType")) {
        options.getString("contentType") ?: "unavailable"
      } else {
        "unavailable"
      }
      val downloadSuccess = options.hasKey("downloadSuccess") &&
        !options.isNull("downloadSuccess") &&
        options.getBoolean("downloadSuccess")
      val cacheHit = options.hasKey("cacheHit") &&
        !options.isNull("cacheHit") &&
        options.getBoolean("cacheHit")
      val iconImplementation = if (bitmap != null) {
        "IconCompat.createWithBitmap"
      } else {
        "IconCompat.createWithResource-default"
      }
      Log.i(
        NOTIFICATION_TAG,
        "Avatar result downloadSuccess=$downloadSuccess cacheHit=$cacheHit " +
          "httpStatus=$httpStatus contentType=$contentType " +
          "bitmapDecodeSuccess=${bitmap != null} " +
          "bitmapDimensions=${bitmap?.let { "${it.width}x${it.height}" } ?: "unavailable"} " +
          "iconImplementation=$iconImplementation",
      )

      val senderIcon = bitmap?.let(IconCompat::createWithBitmap)
        ?: IconCompat.createWithResource(reactContext, defaultAvatarId)
      val sender = Person.Builder()
        .setName(title)
        .setKey(actorId)
        .setIcon(senderIcon)
        .build()
      val receiver = Person.Builder()
        .setName("You")
        .setKey("self")
        .build()
      val sentAt = if (options.hasKey("timestamp") && !options.isNull("timestamp")) {
        options.getDouble("timestamp").toLong()
      } else {
        System.currentTimeMillis()
      }
      val launchIntent = reactContext.packageManager
        .getLaunchIntentForPackage(reactContext.packageName)
        ?: throw IllegalStateException("Unable to open the app from a notification")
      launchIntent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
      launchIntent.action = "${reactContext.packageName}.OPEN_MESSAGE_NOTIFICATION"
      launchIntent.putExtra("notificationId", messageId)
      if (options.hasKey("data") && !options.isNull("data")) {
        val data = options.getMap("data")
        if (data != null) {
          val dataBundle = Arguments.toBundle(data)
          launchIntent.putExtra("data", dataBundle)
        }
      }
      val notificationTag = "ghostchat-message-$messageId"
      val contentIntent = PendingIntent.getActivity(
        reactContext,
        notificationTag.hashCode(),
        launchIntent,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
      )
      val notificationManager = reactContext.getSystemService(
        Context.NOTIFICATION_SERVICE,
      ) as NotificationManager
      if (
        Build.VERSION.SDK_INT >= Build.VERSION_CODES.O &&
        notificationManager.getNotificationChannel(channelId) == null
      ) {
        throw IllegalStateException("Notification channel is unavailable")
      }

      val largeIcon = bitmap ?: drawableToBitmap(defaultAvatarId)
      val notification = NotificationCompat.Builder(reactContext, channelId)
        .setSmallIcon(smallIconId)
        .setContentTitle(title)
        .setContentText(body)
        .setLargeIcon(largeIcon)
        .setContentIntent(contentIntent)
        .setAutoCancel(true)
        .setCategory(NotificationCompat.CATEGORY_MESSAGE)
        .setStyle(
          NotificationCompat.MessagingStyle(receiver)
            .addMessage(body, sentAt, sender)
            .setConversationTitle(title),
        )
        .build()
      notificationManager.notify(notificationTag, 0, notification)
      promise.resolve(null)
    } catch (_: Exception) {
      Log.e(NOTIFICATION_TAG, "Unable to display message notification")
      promise.reject(
        "message-notification-failed",
        "Unable to display message notification",
      )
    }
  }

  @ReactMethod
  fun cacheRemoteImage(rawUrl: String, promise: Promise) {
    Thread {
      val result = try {
        downloadOrUseCachedImage(rawUrl)
      } catch (_: Exception) {
        avatarResult(
          uri = null,
          httpStatus = null,
          contentType = null,
          downloaded = false,
          cacheHit = false,
          failure = "download-error",
        )
      }
      promise.resolve(result)
    }.start()
  }

  private fun downloadOrUseCachedImage(rawUrl: String) =
    synchronized(CACHE_LOCK) {
      val inputUri = runCatching { URI(rawUrl) }.getOrNull()
      if (inputUri?.scheme != "https" || inputUri.host.isNullOrBlank()) {
        return@synchronized avatarResult(
          uri = null,
          httpStatus = null,
          contentType = null,
          downloaded = false,
          cacheHit = false,
          failure = "invalid-url",
        )
      }

      val cachePrefix = sha256(rawUrl)
      cacheDirectory.listFiles()
        ?.firstOrNull {
          it.name.startsWith("$cachePrefix.") &&
            isValidImage(it, contentTypeFor(it.extension))
        }
        ?.takeIf { System.currentTimeMillis() - it.lastModified() < CACHE_TTL_MS }
        ?.let { file ->
          return@synchronized avatarResult(
            uri = Uri.fromFile(file).toString(),
            httpStatus = null,
            contentType = contentTypeFor(file.extension),
            downloaded = false,
            cacheHit = true,
            failure = null,
          )
        }
      cacheDirectory.listFiles()
        ?.filter { it.name.startsWith("$cachePrefix.") }
        ?.forEach { it.delete() }

      val client = OkHttpClient.Builder()
        .connectTimeout(TIMEOUT_MS, TimeUnit.MILLISECONDS)
        .readTimeout(TIMEOUT_MS, TimeUnit.MILLISECONDS)
        .callTimeout(TIMEOUT_MS, TimeUnit.MILLISECONDS)
        .followRedirects(true)
        .followSslRedirects(false)
        .build()
      val request = Request.Builder().url(rawUrl).get().build()
      client.newCall(request).execute().use { response ->
        val status = response.code
        val contentType = response.header("Content-Type")
          ?.substringBefore(';')
          ?.trim()
          ?.lowercase()
        val body = response.body

        if (!response.isSuccessful) {
          return@synchronized avatarResult(
            uri = null,
            httpStatus = status,
            contentType = contentType,
            downloaded = false,
            cacheHit = false,
            failure = "http-error",
          )
        }
        if (!response.request.url.isHttps) {
          return@synchronized avatarResult(
            uri = null,
            httpStatus = status,
            contentType = contentType,
            downloaded = false,
            cacheHit = false,
            failure = "insecure-redirect",
          )
        }
        val imageContentType = contentType
        if (imageContentType == null || imageContentType !in ALLOWED_IMAGE_TYPES) {
          return@synchronized avatarResult(
            uri = null,
            httpStatus = status,
            contentType = contentType,
            downloaded = false,
            cacheHit = false,
            failure = "invalid-content-type",
          )
        }
        if (body == null || body.contentLength() > MAX_IMAGE_BYTES) {
          return@synchronized avatarResult(
            uri = null,
            httpStatus = status,
            contentType = contentType,
            downloaded = false,
            cacheHit = false,
            failure = "invalid-content-length",
          )
        }

        if (!cacheDirectory.exists() && !cacheDirectory.mkdirs()) {
          return@synchronized avatarResult(
            uri = null,
            httpStatus = status,
            contentType = contentType,
            downloaded = false,
            cacheHit = false,
            failure = "cache-unavailable",
          )
        }
        val extension = extensionFor(imageContentType)
        val destination = File(cacheDirectory, "$cachePrefix.$extension")
        val temporary = File(cacheDirectory, "$cachePrefix.part")
        try {
          body.byteStream().use { input ->
            FileOutputStream(temporary).use { output ->
              val buffer = ByteArray(BUFFER_SIZE)
              var totalBytes = 0L
              while (true) {
                val count = input.read(buffer)
                if (count < 0) break
                totalBytes += count
                if (totalBytes > MAX_IMAGE_BYTES) {
                  throw AvatarDownloadException("image-too-large")
                }
                output.write(buffer, 0, count)
              }
              output.fd.sync()
            }
          }
          if (!isValidImage(temporary, imageContentType)) {
            return@synchronized avatarResult(
              uri = null,
              httpStatus = status,
              contentType = contentType,
              downloaded = false,
              cacheHit = false,
              failure = "invalid-image-bytes",
            )
          }
          if (!temporary.renameTo(destination)) {
            return@synchronized avatarResult(
              uri = null,
              httpStatus = status,
              contentType = contentType,
              downloaded = false,
              cacheHit = false,
              failure = "cache-write-failed",
            )
          }
          avatarResult(
            uri = Uri.fromFile(destination).toString(),
            httpStatus = status,
            contentType = contentType,
            downloaded = true,
            cacheHit = false,
            failure = null,
          )
        } catch (error: AvatarDownloadException) {
          avatarResult(
            uri = null,
            httpStatus = status,
            contentType = contentType,
            downloaded = false,
            cacheHit = false,
            failure = error.reason,
          )
        } catch (_: IOException) {
          avatarResult(
            uri = null,
            httpStatus = status,
            contentType = contentType,
            downloaded = false,
            cacheHit = false,
            failure = "download-error",
          )
        } finally {
          temporary.delete()
        }
      }
    }

  private fun isValidImage(file: File, contentType: String?): Boolean {
    if (!file.isFile || file.length() !in 1..MAX_IMAGE_BYTES) return false
    if (contentType !in ALLOWED_IMAGE_TYPES || !hasMatchingImageSignature(file, contentType)) {
      return false
    }
    val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
    BitmapFactory.decodeFile(file.absolutePath, bounds)
    if (
      bounds.outWidth <= 0 ||
      bounds.outHeight <= 0 ||
      bounds.outWidth.toLong() * bounds.outHeight > MAX_IMAGE_PIXELS
    ) {
      return false
    }

    val sampleSize = calculateSampleSize(bounds.outWidth, bounds.outHeight)
    val decoded = BitmapFactory.decodeFile(
      file.absolutePath,
      BitmapFactory.Options().apply { inSampleSize = sampleSize },
    ) ?: return false
    decoded.recycle()
    return true
  }

  private fun decodeCachedAvatar(rawUri: String): Bitmap? {
    val uri = runCatching { Uri.parse(rawUri) }.getOrNull() ?: return null
    if (uri.scheme != "file") return null
    val file = runCatching { File(uri.path ?: return null).canonicalFile }.getOrNull()
      ?: return null
    val cacheRoot = runCatching { cacheDirectory.canonicalFile }.getOrNull() ?: return null
    if (file.parentFile != cacheRoot) return null
    val contentType = contentTypeFor(file.extension) ?: return null
    if (!isValidImage(file, contentType)) return null
    val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
    BitmapFactory.decodeFile(file.absolutePath, bounds)
    return BitmapFactory.decodeFile(
      file.absolutePath,
      BitmapFactory.Options().apply {
        inSampleSize = calculateSampleSize(bounds.outWidth, bounds.outHeight)
      },
    )
  }

  private fun drawableToBitmap(resourceId: Int): Bitmap {
    val drawable = requireNotNull(
      androidx.core.content.ContextCompat.getDrawable(reactContext, resourceId),
    )
    val width = drawable.intrinsicWidth.coerceAtLeast(1)
    val height = drawable.intrinsicHeight.coerceAtLeast(1)
    return Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888).also { bitmap ->
      drawable.setBounds(0, 0, width, height)
      drawable.draw(Canvas(bitmap))
    }
  }

  private fun hasMatchingImageSignature(file: File, contentType: String?): Boolean {
    val header = ByteArray(12)
    val count = FileInputStream(file).use { input -> input.read(header) }
    return when (contentType) {
      "image/jpeg" -> count >= 3 &&
        header[0] == 0xff.toByte() &&
        header[1] == 0xd8.toByte() &&
        header[2] == 0xff.toByte()
      "image/png" -> count >= 8 &&
        header.sliceArray(0..7).contentEquals(
          byteArrayOf(0x89.toByte(), 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a),
        )
      "image/webp" -> count >= 12 &&
        header.copyOfRange(0, 4).decodeToString() == "RIFF" &&
        header.copyOfRange(8, 12).decodeToString() == "WEBP"
      "image/gif" -> count >= 6 &&
        header.copyOfRange(0, 6).decodeToString() in setOf("GIF87a", "GIF89a")
      else -> false
    }
  }

  private fun calculateSampleSize(width: Int, height: Int): Int {
    var sampleSize = 1
    while (width / sampleSize > MAX_DECODE_DIMENSION ||
      height / sampleSize > MAX_DECODE_DIMENSION
    ) {
      sampleSize *= 2
    }
    return sampleSize
  }

  private fun avatarResult(
    uri: String?,
    httpStatus: Int?,
    contentType: String?,
    downloaded: Boolean,
    cacheHit: Boolean,
    failure: String?,
  ) = Arguments.createMap().apply {
    if (uri == null) putNull("uri") else putString("uri", uri)
    if (httpStatus == null) putNull("httpStatus") else putInt("httpStatus", httpStatus)
    if (contentType == null) putNull("contentType") else putString("contentType", contentType)
    putBoolean("downloaded", downloaded)
    putBoolean("cacheHit", cacheHit)
    if (failure == null) putNull("failure") else putString("failure", failure)
  }

  private fun contentTypeFor(extension: String) = when (extension) {
    "jpg", "jpeg" -> "image/jpeg"
    "png" -> "image/png"
    "webp" -> "image/webp"
    "gif" -> "image/gif"
    else -> null
  }

  private fun extensionFor(contentType: String) = when (contentType) {
    "image/jpeg" -> "jpg"
    "image/png" -> "png"
    "image/webp" -> "webp"
    "image/gif" -> "gif"
    else -> error("Unsupported image content type")
  }

  private fun sha256(value: String): String =
    MessageDigest.getInstance("SHA-256")
      .digest(value.toByteArray(Charsets.UTF_8))
      .joinToString("") { byte -> "%02x".format(byte) }

  private val cacheDirectory
    get() = File(reactContext.cacheDir, "notification-avatars")

  private class AvatarDownloadException(val reason: String) : Exception(reason)

  companion object {
    private const val NOTIFICATION_TAG = "GhostChatNotifications"
    private val CACHE_LOCK = Any()
    private const val TIMEOUT_MS = 7000L
    private const val MAX_IMAGE_BYTES = 5L * 1024 * 1024
    private const val MAX_IMAGE_PIXELS = 20_000_000L
    private const val MAX_DECODE_DIMENSION = 512
    private const val CACHE_TTL_MS = 30L * 24 * 60 * 60 * 1000
    private const val BUFFER_SIZE = 8 * 1024
    private val ALLOWED_IMAGE_TYPES = setOf(
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
    )
  }
}

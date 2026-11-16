package expo.modules.smsreader

import android.Manifest
import android.content.pm.PackageManager
import android.net.Uri
import androidx.core.content.ContextCompat
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class SmsReaderModule : Module() {
  companion object {
    private val AMOUNT_REGEX = Regex("(fcfa|xof|francs? cfa)")
    private val KEYWORD_REGEX = Regex("(orange|wave|moov|mtn|money|versement|virement|transfert|paiement|re[çc]u|envoy)")
  }

  override fun definition() = ModuleDefinition {
    Name("SmsReader")

    AsyncFunction("getMoneySmsAsync") { limit: Int ->
      val context = appContext.reactContext
        ?: throw Exception("Contexte Android indisponible.")

      val granted = ContextCompat.checkSelfPermission(
        context,
        Manifest.permission.READ_SMS
      ) == PackageManager.PERMISSION_GRANTED

      if (!granted) {
        throw Exception("Permission de lecture des SMS refusée.")
      }

      val safeLimit = limit.coerceIn(1, 500)
      val messages = ArrayList<Map<String, Any>>()
      val uri = Uri.parse("content://sms/inbox")
      val projection = arrayOf("_id", "address", "body", "date")

      val cursor = context.contentResolver.query(
        uri,
        projection,
        null,
        null,
        "date DESC LIMIT $safeLimit"
      )

      cursor?.use {
        val idIndex = it.getColumnIndex("_id")
        val addressIndex = it.getColumnIndex("address")
        val bodyIndex = it.getColumnIndex("body")
        val dateIndex = it.getColumnIndex("date")

        while (it.moveToNext()) {
          val body = if (bodyIndex >= 0) (it.getString(bodyIndex) ?: "") else ""
          if (!isMoneySms(body)) continue

          val id = if (idIndex >= 0) (it.getString(idIndex) ?: "") else ""
          val address = if (addressIndex >= 0) (it.getString(addressIndex) ?: "") else ""
          val date = if (dateIndex >= 0) it.getLong(dateIndex) else 0L

          messages.add(
            mapOf(
              "id" to id,
              "address" to address,
              "body" to body,
              "date" to date
            )
          )
        }
      }

      messages
    }
  }

  private fun isMoneySms(body: String): Boolean {
    val text = body.lowercase()
    return AMOUNT_REGEX.containsMatchIn(text) && KEYWORD_REGEX.containsMatchIn(text)
  }
}

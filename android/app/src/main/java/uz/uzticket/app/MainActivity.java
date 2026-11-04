package uz.uzticket.app;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.content.ActivityNotFoundException;
import android.net.Uri;
import android.os.Bundle;
import android.graphics.Color;
import android.webkit.*;
import android.view.View;
import android.widget.*;

public class MainActivity extends Activity {
    private static final String HOME = "https://ticket-997e.vercel.app";
    private WebView web;
    private ProgressBar progress;
    private ValueCallback<Uri[]> fileCallback;
    private LinearLayout error;

    private boolean internal(Uri uri) {
        return "https".equals(uri.getScheme()) && "ticket-997e.vercel.app".equals(uri.getHost()) && (uri.getPort() == -1 || uri.getPort() == 443);
    }
    private void external(String url) {
        Uri uri = Uri.parse(url);
        String scheme = uri.getScheme();
        if (!("https".equals(scheme) || "mailto".equals(scheme) || "tel".equals(scheme) || "tg".equals(scheme))) return;
        try { startActivity(new Intent(Intent.ACTION_VIEW, uri).addCategory(Intent.CATEGORY_BROWSABLE)); }
        catch (ActivityNotFoundException e) { Toast.makeText(this, "Havolani ochish uchun ilova topilmadi", Toast.LENGTH_LONG).show(); }
    }
    @Override public void onCreate(Bundle bundle) {
        super.onCreate(bundle);
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(Color.WHITE);
        root.setOnApplyWindowInsetsListener((v, insets) -> {
            v.setPadding(insets.getSystemWindowInsetLeft(), insets.getSystemWindowInsetTop(), insets.getSystemWindowInsetRight(), insets.getSystemWindowInsetBottom());
            return insets.consumeSystemWindowInsets();
        });
        LinearLayout bar = new LinearLayout(this);
        bar.setPadding(8, 4, 8, 4);
        Button home = new Button(this); home.setText("UZTICKET"); home.setOnClickListener(v -> web.loadUrl(HOME));
        Button help = new Button(this); help.setText("24/7 yordam"); help.setOnClickListener(v -> external("https://t.me/uzticket_supportbot"));
        Button browser = new Button(this); browser.setText("↗"); browser.setContentDescription("Brauzerda ochish"); browser.setOnClickListener(v -> external(web.getUrl() == null ? HOME : web.getUrl()));
        bar.addView(home, new LinearLayout.LayoutParams(0, 48, 1)); bar.addView(help, new LinearLayout.LayoutParams(0, 48, 1)); bar.addView(browser, new LinearLayout.LayoutParams(52, 48));
        root.addView(bar);
        progress = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal); root.addView(progress, new LinearLayout.LayoutParams(-1, 5));
        error = new LinearLayout(this); error.setOrientation(LinearLayout.VERTICAL); error.setPadding(24, 32, 24, 24);
        TextView notice = new TextView(this); notice.setText("Internetga ulanishni tekshiring va qayta urinib ko‘ring."); error.addView(notice);
        Button retry = new Button(this); retry.setText("Qayta urinish"); retry.setOnClickListener(v -> { error.setVisibility(View.GONE); web.setVisibility(View.VISIBLE); web.reload(); }); error.addView(retry); error.setVisibility(View.GONE); root.addView(error);
        web = new WebView(this); root.addView(web, new LinearLayout.LayoutParams(-1, 0, 1)); setContentView(root);
        WebSettings settings = web.getSettings(); settings.setJavaScriptEnabled(true); settings.setDomStorageEnabled(true); settings.setAllowFileAccess(false); settings.setAllowContentAccess(true); settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        CookieManager.getInstance().setAcceptCookie(true);
        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest req) {
                if (!req.isForMainFrame()) return false;
                if (internal(req.getUrl())) return false;
                external(req.getUrl().toString()); return true;
            }
            @Override public void onReceivedError(WebView view, WebResourceRequest req, WebResourceError e) {
                if (req.isForMainFrame()) { error.setVisibility(View.VISIBLE); web.setVisibility(View.GONE); }
            }
            @Override public void onPageFinished(WebView view, String url) { CookieManager.getInstance().flush(); }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override public void onProgressChanged(WebView view, int value) { progress.setProgress(value); progress.setVisibility(value == 100 ? View.GONE : View.VISIBLE); }
            @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (!internal(Uri.parse(view.getUrl()))) return false;
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = callback;
                Intent pick = new Intent(Intent.ACTION_OPEN_DOCUMENT); pick.setType("*/*"); pick.addCategory(Intent.CATEGORY_OPENABLE); pick.putExtra(Intent.EXTRA_MIME_TYPES, new String[]{"image/jpeg", "image/png", "application/pdf"});
                try { startActivityForResult(pick, 100); } catch (ActivityNotFoundException e) { fileCallback.onReceiveValue(null); fileCallback = null; }
                return true;
            }
        });
        web.setDownloadListener((url, agent, disposition, mime, length) -> new AlertDialog.Builder(this).setTitle("Faylni yuklab olish").setMessage("Chipta yoki kalendarni yuklab olish uchun shu sahifani brauzerda oching. Zarur bo‘lsa hisobingizga qayta kiring.").setPositiveButton("Brauzerda ochish", (dialog, which) -> external(web.getUrl())).setNegativeButton("Yopish", null).show());
        if (bundle == null || web.restoreState(bundle) == null) web.loadUrl(HOME);
    }
    @Override protected void onActivityResult(int request, int result, Intent data) { super.onActivityResult(request, result, data); if (request == 100 && fileCallback != null) { fileCallback.onReceiveValue(result == RESULT_OK && data != null && data.getData() != null ? new Uri[]{data.getData()} : null); fileCallback = null; } }
    @Override protected void onSaveInstanceState(Bundle out) { web.saveState(out); super.onSaveInstanceState(out); }
    @Override public void onBackPressed() { if (web.canGoBack()) web.goBack(); else super.onBackPressed(); }
    @Override protected void onDestroy() { if (fileCallback != null) fileCallback.onReceiveValue(null); web.destroy(); super.onDestroy(); }
}

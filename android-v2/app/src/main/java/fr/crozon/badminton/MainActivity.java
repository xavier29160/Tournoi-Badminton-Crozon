package fr.crozon.badminton;

import android.app.Activity;
import android.os.Bundle;
import android.webkit.*;
import android.content.Intent;
import android.content.ContentValues;
import android.net.Uri;
import android.provider.MediaStore;
import android.os.Environment;
import android.widget.Toast;
import android.print.PrintManager;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

public class MainActivity extends Activity {
 private WebView web;
 private WebView printWeb;
 private ValueCallback<Uri[]> chooser;
 private static final int PICK = 34, SAVE = 35;
 private String pendingContent;
 @Override public void onCreate(Bundle saved) {
  super.onCreate(saved);
  web = new WebView(this);
  setContentView(web);
  web.getSettings().setJavaScriptEnabled(true);
  web.getSettings().setDomStorageEnabled(true);
  web.getSettings().setAllowFileAccess(false);
  web.getSettings().setAllowContentAccess(true);
  web.getSettings().setTextZoom(100);
  web.setOnApplyWindowInsetsListener((v,insets)->{
   v.setPadding(insets.getSystemWindowInsetLeft(),insets.getSystemWindowInsetTop(),insets.getSystemWindowInsetRight(),insets.getSystemWindowInsetBottom());
   return insets;
  });
  if(android.os.Build.VERSION.SDK_INT>=29)web.getSettings().setForceDark(WebSettings.FORCE_DARK_OFF);
  web.addJavascriptInterface(new ExportBridge(), "AndroidExport");
  web.setWebViewClient(new WebViewClient(){
   @Override public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest request) {
    return !"file:///android_asset/index.html".equals(request.getUrl().toString());
   }
  });
  web.setWebChromeClient(new WebChromeClient(){
   @Override public boolean onShowFileChooser(WebView v,ValueCallback<Uri[]> cb,FileChooserParams params){
    if(chooser!=null)chooser.onReceiveValue(null);
    chooser=cb;
    try{startActivityForResult(params.createIntent(),PICK);}
    catch(Exception e){chooser.onReceiveValue(null);chooser=null;toast("Sélecteur de fichier indisponible");}
    return true;
   }
  });
  web.loadUrl("file:///android_asset/index.html");
 }
 private void toast(String message){runOnUiThread(()->Toast.makeText(this,message,Toast.LENGTH_LONG).show());}
 private void write(Uri uri,String content) throws Exception {
  if(uri==null)throw new Exception("Impossible de créer le fichier");
  try(OutputStream out=getContentResolver().openOutputStream(uri)){
   if(out==null)throw new Exception("Impossible d’ouvrir le fichier");
   out.write(content.getBytes(StandardCharsets.UTF_8));
  }
 }
 @Override protected void onActivityResult(int request,int result,Intent data){
  super.onActivityResult(request,result,data);
  if(request==PICK&&chooser!=null){chooser.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(result,data));chooser=null;}
  if(request==SAVE){
   String content=pendingContent;pendingContent=null;
   if(result==RESULT_OK&&data!=null&&content!=null){try{write(data.getData(),content);toast("Sauvegarde enregistrée");}catch(Exception e){toast("Erreur export : "+e.getMessage());}}
  }
 }
 private class ExportBridge {
  @JavascriptInterface public void printHtml(String html){runOnUiThread(()->{
   if(printWeb!=null){toast("Une impression est déjà en cours");return;}
   final WebView document=new WebView(MainActivity.this);
   printWeb=document;
   document.getSettings().setJavaScriptEnabled(true);
   document.getSettings().setAllowFileAccess(false);
   document.getSettings().setAllowContentAccess(false);
   document.setWebViewClient(new WebViewClient(){
    @Override public void onPageFinished(WebView view,String url){
     document.evaluateJavascript("fitSheets();",ignored->{
      if(isFinishing()||isDestroyed())return;
      PrintManager manager=(PrintManager)getSystemService(PRINT_SERVICE);
      if(manager==null){toast("Service d’impression indisponible");releasePrint(document);return;}
      android.print.PrintDocumentAdapter adapter=document.createPrintDocumentAdapter("Feuilles de poules Crozon");
      try{manager.print("Feuilles de poules Crozon",new android.print.PrintDocumentAdapter(){
       @Override public void onStart(){adapter.onStart();}
       @Override public void onLayout(android.print.PrintAttributes oldAttrs,android.print.PrintAttributes newAttrs,android.os.CancellationSignal signal,LayoutResultCallback callback,Bundle extras){adapter.onLayout(oldAttrs,newAttrs,signal,callback,extras);}
       @Override public void onWrite(android.print.PageRange[] pages,android.os.ParcelFileDescriptor target,android.os.CancellationSignal signal,WriteResultCallback callback){adapter.onWrite(pages,target,signal,callback);}
       @Override public void onFinish(){adapter.onFinish();releasePrint(document);}
      },new android.print.PrintAttributes.Builder().setMediaSize(android.print.PrintAttributes.MediaSize.ISO_A4).setColorMode(android.print.PrintAttributes.COLOR_MODE_MONOCHROME).setMinMargins(new android.print.PrintAttributes.Margins(0,0,0,0)).build());}
      catch(Exception e){toast("Impression impossible : "+e.getMessage());releasePrint(document);}
     });
    }
   });
   document.loadDataWithBaseURL(null,html,"text/html","UTF-8",null);
  });}
  @JavascriptInterface public void printPage(){runOnUiThread(()->{
   PrintManager manager=(PrintManager)getSystemService(PRINT_SERVICE);
   if(manager!=null)manager.print("Tournoi Crozon V2",web.createPrintDocumentAdapter("Tournoi Crozon V2"),null);
  });}
  @JavascriptInterface public void saveFile(String content,String filename,String mime){
   String safe=filename.replaceAll("[^a-zA-Z0-9._-]","_");
   if(android.os.Build.VERSION.SDK_INT<29){
    runOnUiThread(()->{if(pendingContent!=null){toast("Un export est déjà en cours");return;}pendingContent=content;
     Intent intent=new Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType(mime.split(";")[0]).putExtra(Intent.EXTRA_TITLE,safe);
     try{startActivityForResult(intent,SAVE);}catch(Exception e){pendingContent=null;toast("Erreur export : "+e.getMessage());}
    });return;
   }
   Uri uri=null;
   try{
    ContentValues values=new ContentValues();
    values.put(MediaStore.Downloads.DISPLAY_NAME,safe);
    values.put(MediaStore.Downloads.MIME_TYPE,mime.split(";")[0]);
    values.put(MediaStore.Downloads.RELATIVE_PATH,Environment.DIRECTORY_DOWNLOADS+"/TournoiCrozon");
    values.put(MediaStore.Downloads.IS_PENDING,1);
    uri=getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI,values);
    write(uri,content);
    values.clear();values.put(MediaStore.Downloads.IS_PENDING,0);getContentResolver().update(uri,values,null,null);
    toast("Fichier enregistré dans Téléchargements/TournoiCrozon");
   }catch(Exception e){if(uri!=null)getContentResolver().delete(uri,null,null);toast("Erreur export : "+e.getMessage());}
  }
 }
 @Override public void onBackPressed(){web.evaluateJavascript("window.appBack ? appBack() : false",value->{if(!"true".equals(value))MainActivity.super.onBackPressed();});}
 private void releasePrint(WebView document){if(printWeb==document){printWeb=null;document.destroy();}}
 @Override protected void onDestroy(){if(printWeb!=null)releasePrint(printWeb);if(chooser!=null)chooser.onReceiveValue(null);web.removeJavascriptInterface("AndroidExport");web.destroy();super.onDestroy();}
}

package fr.crozon.badminton;

import android.webkit.WebView;
import android.view.View;
import android.view.ViewGroup;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.rule.ActivityTestRule;
import androidx.test.platform.app.InstrumentationRegistry;
import java.lang.reflect.Field;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.Rule;
import org.junit.Test;
import org.junit.runner.RunWith;
import static org.junit.Assert.*;

@RunWith(AndroidJUnit4.class)
public class PoolPrintTest {
 @Rule public ActivityTestRule<MainActivity> activity = new ActivityTestRule<>(MainActivity.class);
 private WebView findWeb(View view){
  if(view instanceof WebView)return (WebView)view;
  if(view instanceof ViewGroup)for(int i=0;i<((ViewGroup)view).getChildCount();i++){WebView found=findWeb(((ViewGroup)view).getChildAt(i));if(found!=null)return found;}
  return null;
 }
 private String js(WebView web,String script) throws Exception {
  CountDownLatch done=new CountDownLatch(1);AtomicReference<String> result=new AtomicReference<>();
  InstrumentationRegistry.getInstrumentation().runOnMainSync(()->web.evaluateJavascript(script,value->{result.set(value);done.countDown();}));
  assertTrue("Réponse JavaScript",done.await(15,TimeUnit.SECONDS));return result.get();
 }
 private void saveScreenshot(String name) throws Exception {
  android.graphics.Bitmap bitmap=InstrumentationRegistry.getInstrumentation().getUiAutomation().takeScreenshot();
  if(bitmap!=null)try(java.io.FileOutputStream out=new java.io.FileOutputStream(new java.io.File(InstrumentationRegistry.getInstrumentation().getTargetContext().getFilesDir(),name))){bitmap.compress(android.graphics.Bitmap.CompressFormat.PNG,100,out);}
 }
 @Test public void poolTitleButtonOpensOnlyThatPoolInAndroidPrintView() throws Exception {
  MainActivity screen=activity.getActivity();AtomicReference<WebView> reference=new AtomicReference<>();
  InstrumentationRegistry.getInstrumentation().runOnMainSync(()->reference.set(findWeb(screen.getWindow().getDecorView())));
  WebView app=reference.get();assertNotNull(app);
  long deadline=System.currentTimeMillis()+30000;
  while(!"true".equals(js(app,"typeof addDirectPoolPrintButtons==='function'"))&&System.currentTimeMillis()<deadline)Thread.sleep(100);
  assertEquals("true",js(app,"typeof addDirectPoolPrintButtons==='function'"));
  // Le pont est celui du WebView Android installé, pas un remplacement de test.
  assertEquals("true",js(app,"typeof AndroidExport.printHtml==='function'"));
  assertEquals("true",js(app,"go('matches');choosePool('A');(function(){var b=document.querySelector('[data-print-pool=\"A\"]');return !!b && b.parentElement.querySelector('h2').textContent.indexOf('Poule A')===0 && b.getBoundingClientRect().top>=0 && b.getBoundingClientRect().top<innerHeight;})()"));
  saveScreenshot("poule-a-button.png");
  js(app,"document.querySelector('[data-print-pool=\"A\"]').click()");
  Field field=MainActivity.class.getDeclaredField("printWeb");field.setAccessible(true);
  AtomicReference<WebView> print=new AtomicReference<>();deadline=System.currentTimeMillis()+15000;
  do{InstrumentationRegistry.getInstrumentation().runOnMainSync(()->{try{print.set((WebView)field.get(screen));}catch(IllegalAccessException e){throw new RuntimeException(e);}});if(print.get()==null)Thread.sleep(100);}while(print.get()==null&&System.currentTimeMillis()<deadline);
  assertNotNull("Le clic doit ouvrir le document Android dédié",print.get());
  String document="false";deadline=System.currentTimeMillis()+15000;
  do{document=js(print.get(),"(function(){return document.querySelectorAll('.sheet').length===1 && document.querySelector('h1').textContent.indexOf('Poule A')===0 && document.querySelectorAll('.matches tbody tr').length===10 && !!document.querySelector('.rankings') && document.body.textContent.indexOf('Récupération locale')<0;})()");if(!"true".equals(document))Thread.sleep(100);}while(!"true".equals(document)&&System.currentTimeMillis()<deadline);
  assertEquals("Une page contenant la poule A, ses 10 matchs et son classement", "true", document);
  // Laisser le dialogue d’impression être affiché ; aucun envoi à une imprimante.
  Thread.sleep(2500);
  saveScreenshot("poule-a-print-preview.png");
 }
}

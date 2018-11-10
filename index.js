String urlString="https://drive.google.com/drive/folders/1x9phuVl5f5CacnVWybDb91N54SnRKNG_";
Intent intent=new Intent(Intent.ACTION_VIEW,Uri.parse(urlString));
intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
intent.setPackage("com.android.chrome");

var ua = navigator.userAgent.toLowerCase();
var isAndroid = ua.indexOf("android") > -1; //&& ua.indexOf("mobile");
if(isAndroid) {
	try {
		context.startActivity(intent);
	} catch (ActivityNotFoundException ex) {
		// Chrome browser presumably not installed so allow user to choose instead
		intent.setPackage(null);
		context.startActivity(intent);
	} 
} else {
	window.location = 'https://drive.google.com/drive/folders/1x9phuVl5f5CacnVWybDb91N54SnRKNG_';
}

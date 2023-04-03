WordPress Calendar Widget Integration
This guide will walk you through adding the calendar-widget.js script to the header of your WordPress website and inserting a custom element to any page.

1. Add the script to the header
To add the script to the header of your WordPress website, you can use the "Insert Headers and Footers" plugin. If you don't have this plugin installed, follow these steps:

Installation
Log in to your WordPress admin dashboard.
Navigate to Plugins > Add New in the left sidebar.
Search for "Insert Headers and Footers" in the search bar.
Locate the plugin by WPBeginner, and click Install Now, followed by Activate.
Insert the script
Go to Settings > Insert Headers and Footers in the left sidebar of your WordPress dashboard.

In the Scripts in Header text box, paste the following code:

html
Copy code
<script src="https://weprayallday.com/scripts/calendar-widget.js" async></script>
Click Save to apply the changes.

2. Add the custom element to the page
To add the custom element <prayer-calendar></prayer-calendar> to any page of your WordPress website, follow these steps:

Navigate to Pages > All Pages in the left sidebar of your WordPress dashboard.

Locate the page where you want to add the custom element and click Edit.

In the Gutenberg editor, add a new block by clicking the "+" button.

Search for the Custom HTML block and click on it to add it to your page.

In the Custom HTML block, paste the custom element code:

html
Copy code
<prayer-calendar></prayer-calendar>
Update or publish the page to save your changes.

3. Test your website
Visit the page where you added the custom element in your web browser. The script should now be loaded and functioning correctly, displaying the content associated with the <prayer-calendar> custom element.

If the script doesn't appear to be working as expected, double-check the script URL, custom element, and their placement in the header and page, respectively. Or you can reach out directly to me at JBlackman@pureheart.org
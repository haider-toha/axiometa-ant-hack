# Getting Started Guide

Source: https://www.axiometa.io/pages/genesis-getting-started-arduino

Using Axiometa Genesis with Arduino IDE
Thank you!
Axiometa is brand new. You are among the very first people to hold this hardware in your hands.
Things will go wrong. When they do, please tell me. I will go above and beyond to patch the issue, ship a fix, and help you get unstuck. This project has been hard to make and your support means everything.
- Povilas
Find Help on Discord
Step by step guide:
1
Pluggin the modules
When inserting modules, make sure they are aligned correctly. The white ground markings can be used as a guide. Align the ground corners and insert the module.
2
Install Arduino IDE
Visit the official Arduino website:
arduino.cc/en/software
Download the latest version of Arduino IDE (2.0 or newer recommended)
Install the software following the standard installation process for your operating system
Launch Arduino IDE once installation is complete
3
Open Preferences
Go to 1.
File > 2. Preferences
4
Open the additional boards manager
Click the tiny logo (3) near Additional board manager URLs
5
Copy and Paste the URL
The URL →
https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
6
Install ESP32 Board Package
5. On the Arduino IDE page on the left-hand side look for tiny board icon, click on it.
6. In the search box type in "esp32"
7. Make sure you find the esp32 by Espressif Systems and click install.
7
Wait
This can take some time, wait until installed and you see a message in the output black box (something like:
Platform esp32:esp32@3.3.0 installed
)
8
Connect and Insert  a module
Connect the GENESIS to the PC.
Grab an RGB Module, labelled as AX22-0006 and insert it into port 7.
9
Select the Correct Port
We need to tell Arduino IDE which to which USB port the GENESIS One is connected to.
8. Easiest way to do so is to click the drop down box as shown.
9. Click
Select other board and port...
10
Find Axiometa GENESIS
10. In the Search Box Type →
Axiometa GENESIS One
11. Select →
Axiometa GENESIS One
or Axiometa Genesis Mini
12. Select the COM Serial port, if you have more options or not sure which is the GENESIS, simply unplug the GENESIS and check which item disappeared then plug the GENESIS back in, that's your port!
13. Click OK!
11
Insert a code snippet
14. Copy & paste the code snippet bellow into the IDE
15. Click Upload
CODE:
void setup() {
pinMode(P4_IO0, OUTPUT);
}
void loop() {
digitalWrite(P7_IO0, HIGH);
delay(500);
digitalWrite(P7_IO0, LOW);
delay(500);
}
12
Wait
Wait until you see the process finish.
13
Check the Board
LED Should be Blinking
Notes about library
The GENESIS One Arduino Library has all the pin definitions built in, so controlling the LED is straightforward
For example for Port 7 GPIO 0, you would call P7_IO0.
For the RGB LED, the color channels map to the GPIO pins like this:
Blue
→ IO0
Red
→ IO1
Green
→ IO2
Therefore you can address pins in code as such.
digitalWrite(P7_IO0, HIGH);//Blue
digitalWrite(P7_IO1, HIGH);//Red
digitalWrite(P7_IO2, HIGH);// Green
Using this principle one can access any port and pin within the IDE.
Support and Help
If you need official support, you can get in touch multiple ways. For quick questions, troubleshooting, or sharing projects, our Discord and Reddit communities are a great place to start.
Support Resources

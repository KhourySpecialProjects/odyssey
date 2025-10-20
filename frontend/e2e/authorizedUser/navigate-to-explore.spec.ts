import { test, expect } from '@playwright/test';

test.use({
  storageState: 'e2e/authorizedUser/auth.json'
});

test('test', async ({ page }) => {
  await page.goto('http://localhost:3000/');
  await page.getByRole('list').getByRole('link', { name: 'Explore' }).click();
  await expect(page.getByRole('main')).toMatchAriaSnapshot(`
    - main:
      - heading "Explore" [level=1]
      - button /Droplets \\(\\d+\\)/
      - button "Playlists (2)"
      - button "Focus Area":
        - img
      - button "Type":
        - img
      - button "Tags":
        - img
      - button "A-Z":
        - img
      - searchbox "Search..."
      - button "Search":
        - img
      - list:
        - link "Technical Skill Building a Profile Generator The droplet addresses the need to automate profile creation for Oasis club members at Northeastern University. Users will learn to design and construct the application's components and enhance its visual appeal through styling. See More":
          - /url: /d/building-a-profile-generator-1
          - listitem:
            - text: Technical Skill Building a Profile Generator
            - paragraph: The droplet addresses the need to automate profile creation for Oasis club members at Northeastern University. Users will learn to design and construct the application's components and enhance its visual appeal through styling.
            - button "See More"
        - link "Technical Skill Building Your First App (Wolly's Mobile) In this droplet, we'll begin by constructing the fundamental elements of Wolly's mobile app. Subsequently, we'll organize these elements using Stacks and optimize the code to incorporate Reusable components. Finally, we'll delve into navigation functionalities within SwiftUI. See More":
          - /url: /d/building-your-first-app-wolly-s-mobile
          - listitem:
            - text: Technical Skill Building Your First App (Wolly's Mobile)
            - paragraph: In this droplet, we'll begin by constructing the fundamental elements of Wolly's mobile app. Subsequently, we'll organize these elements using Stacks and optimize the code to incorporate Reusable components. Finally, we'll delve into navigation functionalities within SwiftUI.
            - button "See More"
        - link "Professional Knowledge Interviews Communication in a Technical Setting Learn about the role of communication within technical settings, diving into a few of the components that contribute to effective communication. With various example scenarios, you will see critical communication skills and understand how to incorporate them into your own life. See More":
          - /url: /d/communication-in-a-technical-setting
          - listitem:
            - text: Professional Knowledge Interviews Communication in a Technical Setting
            - paragraph: Learn about the role of communication within technical settings, diving into a few of the components that contribute to effective communication. With various example scenarios, you will see critical communication skills and understand how to incorporate them into your own life.
            - button "See More"
        - link "Technical Knowledge Cryptography Learn the core concepts of cryptography, types of cryptographic algorithms, and what exactly that “HTTPS” in a URL really means. We will then use these principles to create our own certificate chain! See More":
          - /url: /d/cryptography
          - listitem:
            - text: Technical Knowledge Cryptography
            - paragraph: Learn the core concepts of cryptography, types of cryptographic algorithms, and what exactly that “HTTPS” in a URL really means. We will then use these principles to create our own certificate chain!
            - button "See More"
        - link "Technical Knowledge Databases Design a simple database for a real-world scenario, and learn SQL—a domain-specific programming language for interacting with databases—to draw conclusions. See More":
          - /url: /d/databases
          - listitem:
            - text: Technical Knowledge Databases
            - paragraph: Design a simple database for a real-world scenario, and learn SQL—a domain-specific programming language for interacting with databases—to draw conclusions.
            - button "See More"
        - link "Professional Skill Developing a Droplet Learn the basics of ideating, structuring, proposing, developing, and launching effective Droplets.":
          - /url: /d/developing-a-droplet
          - listitem:
            - text: Professional Skill Developing a Droplet
            - paragraph: Learn the basics of ideating, structuring, proposing, developing, and launching effective Droplets.
        - link "Technical Knowledge Web React Example Droplet":
          - /url: /d/example-droplet
          - listitem: Technical Knowledge Web React Example Droplet
        - link "Technical Skill How to Computer Dive into operating systems, file systems (storage), and interfaces.":
          - /url: /d/how-to-computer
          - listitem:
            - text: Technical Skill How to Computer
            - paragraph: Dive into operating systems, file systems (storage), and interfaces.
        - link "Technical Knowledge Internet Basics Learn how the Internet is organized, structured, and used in our day-to-day lives.":
          - /url: /d/internet-basics
          - listitem:
            - text: Technical Knowledge Internet Basics
            - paragraph: Learn how the Internet is organized, structured, and used in our day-to-day lives.
      - button "chevron-left" [disabled]:
        - img
      - button "1" [disabled]
      - button "2"
      - button "chevron-right":
        - img
    `);
});
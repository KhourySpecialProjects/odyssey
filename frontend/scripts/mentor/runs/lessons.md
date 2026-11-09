# Fixture lessons, for drafting cases

## fundamentals-of-data-science, lesson 422 (blocknote)

```
Droplet: Fundamentals of Data Science
Difficulty: beginner
Learning objectives:
- Understand fundamental python libraries
Lesson: Introduction to Data Science and Its Workflow

[p1] # What Is Data Science?

[p2] ### Overview

[p3] Data science is an interdisciplinary field combining domain expertise, programming, and statistics to

[p4] extract meaningful insights from data. A typical workflow follows five stages: collect, clean, explore,

[p5] model, and communicate.

[p6] ### The Data Science Workflow

[p7] Collect — gather raw data from APIs, databases, sensors, and surveys.

[p8] Clean — handle missing values, outliers, and formatting errors using tools like pandas.

[p9] Explore — summarize distributions and correlations with matplotlib and seaborn.

[p10] Model — apply statistical or machine learning methods using scikit-learn or statsmodels.

[p11] Communicate — present findings clearly using Jupyter notebooks, slides, or dashboards.

[p12] ### Key Insight

[p13] The most impactful data scientists spend the majority of their time on the first three stages: collecting,

[p14] cleaning, and understanding data before a single model is trained.
```

## fundamentals-of-data-science, lesson 423 (blocknote)

```
Droplet: Fundamentals of Data Science
Difficulty: beginner
Learning objectives:
- Understand fundamental python libraries
Lesson: Understanding Data Types and Variable Classification

[p1] # Data Types & Structures

[p2] ### Core Concepts

[p3] The type of variable you are working with determines which operations, visualizations, and models are

[p4] appropriate. Treating a categorical variable as a number is one of the most common beginner mistakes.

[p5] ### Variable Types

[p6] Continuous — numeric with infinite possible values (e.g. salary, temperature). Best summarized

[p7] with mean and standard deviation.

[p8] Discrete — numeric but countable (e.g. number of purchases). Use count or median.

[p9] Nominal — categories with no meaningful order (e.g. country, color). Use mode or frequency.

[p10] Ordinal — categories with a meaningful order (e.g. star ratings 1–5). Use median or rank.

[p11] Boolean — only two possible values, yes/no or true/false. Summarized as a proportion.

[p12] ### Common Pitfall

[p13] Zip codes, phone numbers, and ID columns look numeric but are nominal. Always ask: does arithmetic

[p14] on this column make sense? If not, treat it as categorical.
```

## fundamentals-of-data-science, lesson 424 (blocknote)

````
Droplet: Fundamentals of Data Science
Difficulty: beginner
Learning objectives:
- Understand fundamental python libraries
Lesson: Exploratory Data Analysis: Concepts and Techniques

[p1] # Exploratory Data Analysis

[p2] ### Core Concepts

[p3] Exploratory Data Analysis (EDA) is the process of visually and statistically summarizing a dataset

[p4] before applying any models. The goal is to understand the shape, spread, and relationships in the data.

[p5] EDA was formalized by statistician John Tukey in 1977 and remains the most critical step in any

[p6] analysis.

[p7] ### Key Visualizations

[p8] Histogram — shows the distribution of a single variable. Use df["col"].plot.hist() or plt.hist(df["col"]).

[p9] Boxplot — displays spread and highlights outliers. Use df.boxplot(column="col").

[p10] Scatter plot — reveals the relationship between two numeric variables. Use df.plot.scatter(x="a",

[p11] y="b").

[p12] Correlation matrix — df.corr() gives you the numbers; plt.imshow(df.corr()) renders the heatmap.

[p13] Bar chart — shows frequency counts for categorical variables. Use

[p14] df["col"].value_counts().plot.bar().

[p15] ### Quick-Look Helpers

[p16] Before you plot, pandas gives you three one-liners worth memorizing:

[p17] df.head() — first five rows, to sanity-check the load.

[p18] df.info() — column names, dtypes, non-null counts. Catches missing data fast.

[p19] df.describe() — count, mean, std, min/max, and quartiles for every numeric column.

[p20] [Code block, python, editable, runnable]
```python
import pandas as pd
import matplotlib.pyplot as plt
df = pd.read_csv("housing_prices.csv")
```

[p21] [Code block, python, editable, runnable]
```python
df.info()
```

[p22] [Code block, python, editable, runnable]
```python
df["price"].plot.hist(bins=30, edgecolor="black")
plt.xlabel("Price")
plt.title("Distribution of Housing Prices")
plt.show()
```

[p23] [Code block, python, editable, runnable]
```python
df.boxplot(column="price")
plt.title("Housing Price — spread & outliers")
plt.show()
```

[p24] ### Rule of Thumb

[p25] Always plot before you model. A single histogram can reveal a bimodal distribution, an outlier, or a data

[p26] entry error that would silently distort every downstream result.

[p27] [Quiz question] What is the primary goal of EDA?
  - To train a predictive model as quickly as possible
  - To clean the dataset by removing all outliers
  - To understand the shape, spread, and relationships in the data before modeling
  - To produce a final report for stakeholders
````

Question 741879564: What is the primary goal of EDA?

- 3100: To train a predictive model as quickly as possible
- 3101: To clean the dataset by removing all outliers
- 3102: To understand the shape, spread, and relationships in the data before modeling **(correct; for review only, never sent to the model)**
- 3103: To produce a final report for stakeholders

## internet-basics, lesson 39 (classic)

```
Droplet: Internet Basics
Learning objectives:
- TBD
Lesson: A Network of Cables

[p1] While our focus this week is not on physical infrastructure, it is incredibly interesting to touch on how global connections are made. About 99% of transoceanic internet traffic actually travels through underwater [fiber-optic](https://www.lifewire.com/fiber-optic-cable-817874) cables. They transmit data by guiding light as pulsating binary code through reflective glass.

[Image: network.png]

[p2] Source: [*Ripley Tools*](https://ripley-tools.com/taking-a-closer-look-at-the-anatomy-of-a-fiber-optic-cable/)

[p3] Ownership and maintenance of these cables are distributed across large telecommunication networks like AT&T and China Telecom, tech giants such as Google and Meta, and national government agencies, to serve their needs and regions. An interactive map of these cables is available [here](https://www.submarinecablemap.com/).

[p4] [Callout, info] **You may be wondering**: why aren’t satellites used? When transmitting data to and from space, satellites introduce a delay known as latency. This is problematic for services that need an immediate response, but they have proven useful for connecting remote and rural areas where laying traditional cable infrastructure is challenging.

[p5] At each end, cables connect to terrestrial infrastructure at **cable termination stations**. This allows for the high-speed data transmission from a data center across the world to your computer or device.
```

## internet-basics, lesson 40 (classic)

```
Droplet: Internet Basics
Learning objectives:
- TBD
Lesson: Internet Protocol

[p1] As mentioned in our introduction, the Internet is a “distributed packet-switched network.” Let’s break down what each component means:

[p2] - **Distributed**: No single entity or location has control over the Internet. Any computer that can send and receive data according to the agreed upon rules can join, creating a web of computers, servers, and devices.
- **Packet-switched**: A [packet](https://www.cloudflare.com/learning/network-layer/what-is-a-packet/) is a small piece of data. Messages are broken into smaller pieces and travel independently to their destination.
- **Network**: The collection of computers that are somehow linked together, whether on a local, regional, or global scale.

[p3] It is fundamental that data packets reach the correct destination and are reassembled properly with other packets. The standardized procedure that allows computers and devices to communicate over a global network is known as the Internet Protocol.

[p4] The **Internet Protocol** is a protocol or set of rules that govern how packets are addressed and routed over the Internet. It provides the essential framework that enables information to be properly exchanged to an intended recipient.

[p5] [Callout, info] Throughout the remainder of this module, note that “IP” is used as an acronym for “Internet Protocol”.
```

## internet-basics, lesson 41 (classic)

```
Droplet: Internet Basics
Learning objectives:
- TBD
Lesson: IP Addresses

[p1] An **IP Address** is a unique numeric label that identifies a computer on a network. Every domain or device that is connected to the Internet, whether it's your mobile phone, personal computer, or router, has one. This is just like how every building has a street address. IP Addresses are assigned by [IANA](https://www.iana.org/), the Internet Assigned Numbers Authority.

[p2] Since its inception, there have been many IP formats. The fourth version of IPs, **IPv4**, was introduced in 1983. An IPv4 address has four (4) sets of numbers, each ranging from 0 to 255. Each set is separated by a dot (`.`). An example is `172.16.254.1`.

[Image: ipv4.png]

[p3] An important thing to remember is that computers represent data with a **binary** number system. Binary uses **bits** (binary digits) to store information in a state of either “0” or “1”. Each bit represents an increasing power of 2: the first is 2^1, the second is 2^2, the third is 2^3, and so on.

[p4] In each set of IPv4, there are 256 possible numbers, which is equivalent to 2^8, 8 bits, or a byte. A **byte** is simply a unit of digital information that is 8 bits long. Putting it all together, with 4 sets of bytes, there are 32 possible binary digits, producing 2^32 or ~4.3 billion possible IPv4 addresses.

[p5] [Callout, info] Known as the “loopback address”, *localhost* is the domain name describing IPv4 `127.0.0.1`. It refers to the current device that was used to access it, allowing you to access network services on *your own* computer. Localhost is important for web development, testing, and debugging reasons.

[p6] An IPv6 address has 8 groups of 4 characters using [hexadecimal numbers](https://en.wikipedia.org/wiki/Hexadecimal) separated by colons (:). In binary, this produces 128 possible digits or 16 bytes long, supporting 2^128 or about *320 trillion* possible addresses!

[Image: ipv6.png]

[p7] Despite IPv6’s enhanced security features and routing efficiency, its complete adoption has been delayed largely due to [network address translation](https://www.comptia.org/content/guides/what-is-network-address-translation) (NAT). NAT allows machines to map multiple private addresses (used in a local network) to a single public IP address (globally routable through the Internet).

[p8] [Callout, info] While subtle, there is a difference between an internet and *the Internet*. When written with a capital “I”, the Internet refers to the worldwide set of interconnected networks we normally associate with the term. A lowercase “i” denotes any generic interconnected network.
```

## internet-basics, lesson 42 (classic)

````
Droplet: Internet Basics
Learning objectives:
- TBD
Lesson: DNS

[p1] ### What is DNS?

[p2] We mentioned earlier that each *domain* and device have an IP address. So, why do we not need to memorize IP Addresses to navigate the web? The answer is the “phonebook of the Internet”, better known as DNS. The **Domain Name System (DNS)** is a collection of databases that map human-readable domain names to computer-friendly IP Addresses.

[p3] Consider navigating to the domain `www.google.com`:

[p4] Using the [ping](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/ping) command from our terminal, we can test our IP-level connectivity to a destination computer.

[p5]
```
user> ping www.google.com

Pinging www.google.com [142.251.40.100] with 32 bytes of data:
Reply from 142.251.40.100: bytes=32 time=27ms TTL=113
Reply from 142.251.40.100: bytes=32 time=27ms TTL=113

Ping statistics for 142.251.40.100:
    Packets: Sent = 4, Received = 4, Lost = 0 (0% loss),
Approximate round trip times in milli-seconds:
    Minimum = 26ms, Maximum = 32ms, Average = 28ms
```

[p6] This example verifies that our message requests are responded to from an IP Address, specifically `142.251.40.100`! If you were to run the command multiple times, you will likely receive responses from different IP addresses. Popular websites employ **load balancing** to distribute traffic evenly across multiple servers.

[p7] To understand how DNS can translate domains, let’s first break down their nomenclature:

[p8] - `com` is the **top-level domain (TLD)**. TLDs often categorize a website’s purpose. For example, “com” is short for “commercial business”, “edu” stands for education, and country code TLDs (eg: “tv” for Tuvalu). It’s worth noting that there are also generic TLDs such as “win”, “store”, and “xyz”. A full list of TLDs can be found from IANA [here](https://data.iana.org/TLD/tlds-alpha-by-domain.txt).
- `google` is the **second-level domain (SLD)**, which refers to the specific website, project, or organization.
- `www` is the **subdomain**. They are optional and used to further organize domain resources, targeting content to improve [Search Engine Optimization](https://developers.google.com/search/docs/fundamentals/seo-starter-guide?visit_id=638279908678663983-2664387115&rd=1). Common examples include “www” for websites, “blog” for, you guessed it, blogs, and “mail” for email servers. Sometimes subdomains are chained, leading to URLs like “[sub1.sub2.sub3.google.com](http://sub1.sub2.sub3.google.com)”.

[p9] ### How Does DNS Work?

[p10] To understand what exactly happens when you enter a domain name in a web browser, please watch the following video **starting at 1:51** and **up to 4:30**. Collectively, this process is called a **DNS lookup**.

[p11] *Disclaimer: the narrator of the video at times may verbally say "TDL" when they mean "TLD".*

[Video: https://www.youtube.com/embed/FsGUi5pXpLk?si=Ipg6adem6tUbaWbH]
````

## internet-basics, lesson 43 (classic)

```
Droplet: Internet Basics
Learning objectives:
- TBD
Lesson: Transport Protocol

[p1] **IP Packets** attach a header to a packet of data. The header contains notable information about the packet, such as the sending and receiving addresses, and other fields like what transport protocol is being used. These are the two most common protocols:

[p2] ### TCP

[p3] The **Transmission Control Protocol** initially complemented the Internet Protocol, commonly being referred to as the TCP/IP suite. It maintains a connection called a “handshake” between the sender and receiver until the data is transmitted in the preserved order. Since packets can take different routes across a network, TCP assigns numbers to identify corrupted, lost, disordered, or duplicated segments and execute precise error-control to resend packets as needed. This ensures reliability at the cost of speed via a flow control.

[p4] ### UDP

[p5] The **User Datagram Protocol**, known as the UDP/IP suite, is a connectionless means of transmitting data between devices on a network. A connection is not established or terminated for transfer. Instead, it sends packets of data referred to as **datagrams**. This results in improved overhead and latency at the cost of reliability.

[p6] UDP does not execute any error checking or flow control like TCP, nor is it concerned if all the datagrams arrive and in proper order. Likewise, UDP has a much smaller header than TCP, only containing the essential fields. For time-sensitive transmissions, UDP is preferred and used in online gaming, media streaming, VoIP (Voice over IP) services like Teams phones, and DNS lookups.

[p7] [Quiz question] 378.256.0.0 is a valid IPv4 Address
  - TRUE
  - FALSE

[p8] [Quiz question] Match the subdomain, second-level domain, and top-level domain of northeastern.instructure.uk.
  - Subdomain : northeastern
  - Second-level domain : instructure
  - Top-level domain: uk

[p9] [Quiz question] A domain name can correspond to *more than one* IP address.
  - True
  - False

[p10] [Quiz question] The IP address as initially specified by the domain name is returned by which server in the DNS lookup?
  - Root name server
  - TLD name server
  - SLD name server
  - Authoritative name server

[p11] [Quiz question] UDP is known for its low latency and connectionless data transfer, but it sacrifices which element compared to TCP?
  - Reliability
  - Speed
  - Header Size
  - Security
```

Question 6 (no hints): 378.256.0.0 is a valid IPv4 Address

- 7: TRUE
- 8: FALSE **(correct; for review only, never sent to the model)**

Question 7 (no hints): Match the subdomain, second-level domain, and top-level domain of northeastern.instructure.uk.

- 9: Subdomain : northeastern **(correct; for review only, never sent to the model)**
- 10: Second-level domain : instructure **(correct; for review only, never sent to the model)**
- 11: Top-level domain: uk **(correct; for review only, never sent to the model)**

Question 9 (no hints): A domain name can correspond to _more than one_ IP address.

- 13: True **(correct; for review only, never sent to the model)**
- 12: False

Question 8: The IP address as initially specified by the domain name is returned by which server in the DNS lookup?

- 14: Root name server
- 15: TLD name server
- 16: SLD name server
- 17: Authoritative name server **(correct; for review only, never sent to the model)**

Question 10: UDP is known for its low latency and connectionless data transfer, but it sacrifices which element compared to TCP?

- 18: Reliability **(correct; for review only, never sent to the model)**
- 19: Speed
- 20: Header Size
- 21: Security

## internet-basics, lesson 44 (classic)

```
Droplet: Internet Basics
Learning objectives:
- TBD
Lesson: World Wide Web

[p1] The **World Wide Web**, referred to as “WWW”, “W3”, or simply the “Web”, is the leading Internet information retrieval service. Importantly, the Web is *not* the Internet! It is a service built-on much like file sharing, email, and online gaming, where the Internet is the underlying architecture that enables info to be disseminated.

[p2] The fundamental building block of the Web is a [webpage](https://en.wikipedia.org/wiki/Web_pagehttps://en.wikipedia.org/wiki/Web_page)—a document viewable from your device’s browser, such as the one you are viewing now. Webpages feature an organization of plain text, multimedia, and other content. A **website** is a collection of webpages, starting from the homepage.

[p3] [Callout, info] ## Web 2.0
The second generation of the World Wide Web, Web 2.0, is a term used to denote the shift from read-only, static webpages to dynamic webpages focused on user-generated content. It became popularized soon after the burst of the dot.com bubble in 2000 from highly speculative investments in internet-based businesses, leading to a mild recession. Some prominent features include a participatory culture, folksonomy (the classification of online content), and cloud computing.

[p4] The World Wide Web was developed by Tim-Berners Lee and colleagues at CERN, located in Geneva, Switzerland, and released in 1992. Lee notably invented **HTML (Hypertext Markup Language)** for marking up text on a webpage, HTTP protocol to standardize communication across devices, and the URL system to identify webpages. Another integral component of their design was the [hyperlink](https://en.wikipedia.org/wiki/Hyperlink), allowing users to seamlessly navigate to other webpages just by clicking a reference.
```

## internet-basics, lesson 45 (classic)

```
Droplet: Internet Basics
Learning objectives:
- TBD
Lesson: HTTP

[p1] An **HTTP (Hypertext Transfer Protocol)** request is a message from a client (your computer’s browser) to a server to access a resource or initiate an action. **Hypertext** refers to any text containing hyperlinks. HTTP is a *stateless* protocol, meaning the receiving server does not retain information from previous requests.

[p2] After the DNS lookup, your browser makes an HTTP request to the address that hosts the site. The web server responds, sending the content for the browser to render on your computer!

[p3] HTTP is structured using [HTTP request methods](https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods), also called *HTTP verbs*. The most common methods are below:

[p4] | HTTP Request Method | Description | Associated [https://developer.mozilla.org/en-US/docs/Glossary/CRUD](https://developer.mozilla.org/en-US/docs/Glossary/CRUD) Operation |
| POST | creates a new resource | Create |
| GET | requests information—should only return, not modify, data | Read |
| PUT | updates existing data | Update |
| DELETE | removes existing resources | Delete |

[p5] In response, the server will return a status code and any requested data, if appropriate. **Status codes** are three-digit numbers returned by a web server that indicate the outcome of an HTTP request. They are divided into 5 classes based on the first digit:

[p6] - **1xx**: Informational
- **2xx**: Success
- **3xx**: Redirection
- **4xx**: Client error
- **5xx**: Server error

[p7] For example, try navigating to `www.google.com/northeastern`. Your browser will display a `404 Not Found` error 😟: the server cannot find the webpage requested by the client. For a complete description of all status codes, check out the [MDN documentation](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status).

[p8] ### HTTP Structure & Security

[p9] To understand how HTTP requests and responses are structured using headers, please watch the following video from **8:50 to 12:20**.

[Video: https://www.youtube.com/embed/wW2A5SZ3GkI?si=7iRgdPI99W9wzfU1]

[p10] If you look at your browser’s search bar, you will notice that the URL for Northeastern’s Canvas courses is prefixed by “HTTP`S`” as opposed to just “HTTP”. The primary distinction is that HTTPS is more secure, hence why it stands for: Hypertext Transfer Protocol `Secure`. For those interested in learning more, a future Cybersecurity module will cover encryption.
```

## internet-basics, lesson 46 (classic)

````
Droplet: Internet Basics
Learning objectives:
- TBD
Lesson: URL Components

[p1] Web addresses are formally known as **URLs** or **Uniform Resource Locators**. A [URL](https://url.spec.whatwg.org/) is a standardized way to uniquely identify a resource over an internet. Below are the most important elements, some mandatory and some optional, for a URL’s structure:

[p2] `scheme://host:port/path?query#fragment`

[p3] For the next section, consider the following URL: `https://www.youtube.com/results?search_query=northeastern+khoury&example=123`.

[p4] ### Scheme

[p5]
```
**https://**
```

[p6] The **scheme** specifies the protocol that will be used for the transmission of data. We just covered HTTP and HTTPS. Alternative protocols include [FTP](https://en.wikipedia.org/wiki/File_Transfer_Protocol) (File Transfer Protocol) for exchanging files and [SMPT](https://en.wikipedia.org/wiki/Simple_Mail_Transfer_Protocol) (Single Mail Transfer Protocol) for transferring emails.

[p7] ### Host

[p8]
```
https://**www.youtube.com**
```

[p9] The **host** identifies the requested web server, either by its domain name or IP address. As discussed earlier, a domain name can be broken down into the subdomain, second-level domain, and top-level domain for categorization and organization.

[p10] ### Port

[p11]
```
<https://www.youtube.com>**:443**
```

[p12] The **port** defines a connection endpoint on the server, indicating where the resources will be accessed. By default, HTTP uses port 80 and HTTPS is identified by 443. For other schemes, the port number must be provided. If supplied with the domain name, the host and port are collectively referred to as the **authority**.

[p13] ### Path

[p14]
```
<https://www.youtube.com:443>**/results**
```

[p15] The **path** indicates a resource on the web server relative to its root location. It typically references an exact file resource. For more info on path construction and subdirectories, please revisit Module 4a: How to Computer.

[p16] ### Query

[p17]
```
<https://www.youtube.com:443/results**?search_query=northeastern+khoury&example=123**>
```

[p18] The **query** is used to pass additional identifying information to a webpage. It consists of key-value pairs separated by an ampersand (`&`), all together called **parameters**. You may pass any key-values in a URL, but their effects are determined by the given website’s handling.

[p19] ### Fragment

[p20] The **fragment** points to a specific section, typically within HTML headers, of the resource. The entire fragment follows the hashtag (`#`). The browser can locate the designated spot, or, on video or audio files, it can refer to a timestamp. For example, we have used the fragment to highlight sections in certain referenced links. To do this yourself, highlight text on a webpage, right click the highlight, and click “Copy link to highlight” to generate a URL with a fragment.

[p21] URLs are a type of URI. A **URI (Uniform Resource Identifier)** refers to the unique character sequence that identifies an abstract or physical resource. A URL defines a resource’s location, whereas a URI may also be used to describe a resource’s name.
````

## internet-basics, lesson 47 (classic)

```
Droplet: Internet Basics
Learning objectives:
- TBD
Lesson: Web Browsers & Search Engines

[p1] When the World Wide Web was first released, people could only access websites they had remembered or could guess the URL for. Human-edited directories were soon released to reference other sites, such as "[Jerry and Dave’s Guide to the World Wide Web](https://en.wikipedia.org/wiki/History_of_Yahoo!)" (later renamed Yahoo). As the Web grew, it warranted a better approach for navigation.

[p2] ### Search Engines

[p3] A **search engine** searches for content on the Web. They consist of three main parts:

[p4] 1. A **crawler** automatically scans websites for key information. The bot “chases” all viewable links from a page.
2. The **index** accumulates webpages, specifically important content and keywords, found by a crawler. When you perform a search, you are actually searching this database.
3. The **search algorithm** ranks all of the webpages that are relevant to the search. It asks questions that combine all of the key factors, including how many credible links point to the site (called **backlinks**), relevancy, authenticity, and spam content, to determine rankings and produce the results you see anytime you search the Web.

[p5] [Callout, info] ## **Search Engine Optimization (SEO)**
SEO refers to how an organization or entity can maximize their presence in search results. The goal is to increase their quantity and quality of visitors. There are two types:
- **On-page SEO** refers to optimizing the actual website. This includes improving structure to increase customer engagement, or content changes to boost crawler recognition like using popular search terms, adding meta tags, or editing the URL address.
- **Off-page SEO** is building your website authority through other channels. The primary mechanism is to boost link popularity, but it also includes social media and diverse marketing efforts.
Popular examples of search engines include Google, Bing, DuckDuckGo, Yandex, and Yahoo.

[p6] [Callout, info] ## **Web Browsers**
A **web browser** (often referred to as just “browser”) is a software application that allows you to retrieve and visit webpages. Browsers utilize search engines to retrieve sites, and they feature a GUI to support visuals and user interaction.
Information, such as cookies or history, may be retained through cache memory to improve user experience. Other prominent features include bookmarking and password storage along with extension support for user customization.
Common browsers include Google Chrome, Mozilla Firefox, Microsoft Edge, Apple Safari, Opera, and Arc.

[p7] [Callout, info] Fun fact: Netscape Navigator, now discontinued, was the first commercially available web browser with a GUI, released in 1994.

[p8] ### Clarification

[p9] Companies sometimes produce search engines, web browsers, *and* operating systems, leading to confusion among the three. Remember: search engines are a service that find content on the web, web browsers are infrastructure that allow you to view webpages, and operating systems are software that manage your device’s files and programs by communicating with its hardware.

[p10] ## Cookies!

[p11] Most people blindly agree to terms of service and privacy agreements. Similarly, we may choose to accept all cookies without considering the impact. Please watch the following video to learn what webpage cookies are, how they are used to track user activity, and potential hazards:

[Video: https://www.youtube.com/embed/I01XMRo2ESg?si=-g1DO0ylCFGo8KBP]
```

## internet-basics, lesson 49 (classic)

```
Droplet: Internet Basics
Learning objectives:
- TBD
Lesson: Check-In Questions

[p1] [Quiz question] Which term is **NOT** used as a shorthand for the “World Wide Web”?
  - www
  - W3
  - The web
  - The Internet

[p2] [Quiz question] The HTTP 418 I'm a teapot status code falls into which class? *Yes,* [`*it’s real*`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/418)*.*
  - Informational
  - Success
  - Redirection
  - Client
  - Server

[p3] [Quiz question] What character or sequence denotes the start of a *query* in a URL?
  - ://
  - :
  - ?
  - #

[p4] [Quiz question] Consider this scenario: Steve updates his website’s layout and color theme to align with an upcoming holiday and boost traffic. What technique is Steve most closely employing?
  - On-page SEO
  - Off-page SEO
  - Indexing
  - Browser enhancement
```

Question 11: Which term is **NOT** used as a shorthand for the “World Wide Web”?

- 22: www
- 23: W3
- 25: The web
- 26: The Internet **(correct; for review only, never sent to the model)**

Question 12: The HTTP 418 I'm a teapot status code falls into which class? _Yes,_ [`*it’s real*`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/418)_._

- 27: Informational
- 28: Success
- 29: Redirection
- 30: Client **(correct; for review only, never sent to the model)**
- 31: Server

Question 13: What character or sequence denotes the start of a _query_ in a URL?

- 32: ://
- 33: :
- 34: ? **(correct; for review only, never sent to the model)**
- 35: #

Question 14: Consider this scenario: Steve updates his website’s layout and color theme to align with an upcoming holiday and boost traffic. What technique is Steve most closely employing?

- 36: On-page SEO **(correct; for review only, never sent to the model)**
- 37: Off-page SEO
- 38: Indexing
- 39: Browser enhancement

## mastering-the-behavioral-interview, lesson 167 (classic)

```
Droplet: Mastering the Behavioral Interview
Learning objectives:
- Understand the purpose and significance of behavioral interviews in the tech industry and what types of question are usually asked.
- Learn the STAR method for structuring responses to behavioral interview questions.
- Practice formulating responses to common behavioral interview questions related to technical and personal skills, personal and academic projects, leadership, teamwork, and problem-solving abilities.
- Develop effective storytelling techniques to showcase relevant experiences and accomplishments.
- Reflect on personal interview performance and identify areas for improvement in interview preparation strategies.
Lesson: Understanding the STAR Method

[p1] ### **What is the STAR Method?**

[p2] ***To continue through this module, we strongly encourage you to complete the “What is the Star Method” droplet, but we will provide a comprehensive overview of it as well*

[p3] The STAR method is a common approach used to answer behavioral interview questions. It provides a structured format you can use to tell a story by laying out the situation, task, action, and result.

[p4] 1. **Situation**: Describe the context or situation you were in. Provide enough detail for the interviewer to understand the scenario.
2. **Task**: Explain the specific task or challenge you faced in that situation. What were **YOU** responsible for accomplishing?
3. **Action**: Detail the actions you took to address the task/challenge. Focus on your contributions and the process you followed.
4. **Result**: Finish by discussing the outcomes or results of your actions. What happened as a result of your efforts? Ideally, highlight positive outcomes and quantify achievements when possible.

[p5] The STAR method helps candidates structure their responses in a clear and concise manner, ensuring they provide relevant examples and showcase their skills effectively during the interview.

[p6] *General Breakdown for the STAR method and approximate percentage of time you should spend in each section.*

[Image: star model.png]

[p7] From MIT Career Advising & Professional Development [https://capd.mit.edu/resources/the-star-method-for-behavioral-interviews/](https://capd.mit.edu/resources/the-star-method-for-behavioral-interviews/)

[p8] ### **How To: STAR Method**

[Video: https://www.youtube.com/embed/dWK26jZgsM8?si=IelflMRxWNH3f-uk]

[p9] ### Check-in: Understanding the STAR Method

[p10] Below, we will provide a sample interview question and response which makes use of the STAR method in an effective way to convey all necessary information.

[p11] [Callout, info] **Sample Behavioral Question:** "Tell me about a time when you had to resolve a conflict with a team member during a project."
**Situation:** During my sophomore year in college, I was assigned to a group project for my marketing class. Our task was to develop a comprehensive marketing plan for a local startup.
**Task:** One of the challenges our team encountered was a disagreement between myself and a team member regarding the direction of our marketing strategy. She strongly advocated for a traditional marketing approach, while I believed that incorporating digital marketing tactics would better reach our target audience.
**Action:** To address the conflict, I first wanted to have a one-on-one chat with her to understand her perspective better and express my own. I actively listened to the reasoning behind her approach, acknowledging the validity of her points. Then, I explained my rationale in favor of digital marketing, providing examples of successful campaigns and insights that supported this strategy.
Together, we decided to meet with our professor to seek guidance and input, our other teammates who didn’t have as strong opinions we also present because we wanted it ot be a team decision. During the meeting, we presented both approaches and discussed the pros and cons of each. Through open dialogue and compromise, we developed a hybrid marketing strategy that integrated elements of both traditional and digital marketing. We were able to address both of our concerns and showcase the different abilities of all group members.
**Result:** As a result of our collaborative effort, our team received positive feedback from our professor for our innovative campaign. Not only did we successfully resolve the conflict, but we also strengthened our teamwork skills and achieved a higher grade on the project than we initially anticipated.

[p12] [Quiz question] Which step of the STAR method involves discussing the specific task or challenge faced during the situation described?
  - Situation: Having a collaborative team project in class.
  - Task: Going through a disagreement with a team member.
  - Action: Having a one-on-one chat with the team-mate and later speaking with the professor.
  - Result: Coming up with a collaborative strategy for the project.

[p13] [Quiz question] True or False: The STAR method stands for Situation, Trouble, Action, Reflection.
  - True
  - False
```

Question 38: Which step of the STAR method involves discussing the specific task or challenge faced during the situation described?

- 125: Situation: Having a collaborative team project in class.
- 126: Task: Going through a disagreement with a team member. **(correct; for review only, never sent to the model)**
- 128: Action: Having a one-on-one chat with the team-mate and later speaking with the professor.
- 127: Result: Coming up with a collaborative strategy for the project.

Question 39 (no hints): True or False: The STAR method stands for Situation, Trouble, Action, Reflection.

- 130: True
- 129: False **(correct; for review only, never sent to the model)**

## mastering-the-behavioral-interview, lesson 169 (classic)

```
Droplet: Mastering the Behavioral Interview
Learning objectives:
- Understand the purpose and significance of behavioral interviews in the tech industry and what types of question are usually asked.
- Learn the STAR method for structuring responses to behavioral interview questions.
- Practice formulating responses to common behavioral interview questions related to technical and personal skills, personal and academic projects, leadership, teamwork, and problem-solving abilities.
- Develop effective storytelling techniques to showcase relevant experiences and accomplishments.
- Reflect on personal interview performance and identify areas for improvement in interview preparation strategies.
Lesson: Tips and Tricks to Ace the Interview

[p1] We know there is probably a lot going on in your mind before interviewing for a potential employer. To make life a little easier, we are providing some good-to-knows to help you prepare.

[p2] By implementing these tips and pointers, students can alleviate interview anxiety and present themselves more professionally prepared during the interview process.

[p3] 🏢 **Research the Company**: Take the time to research the company, its mission, values, and culture. Understanding the organization's background can help you feel more confident and prepared to discuss how your skills and experiences align with their needs.

[p4] ☕ **Avoid Overcaffeination**:

[p5] Limit your caffeine intake to moderate levels, especially on the day of your interview. If you normally drink coffee, consider having a small amount in the morning to help you feel alert but to avoid excessive consumption of coffee anxiety.

[p6] 👔 **Dress Appropriately**: Choose professional attire that is appropriate for the industry and company culture. Dressing well can boost your confidence and make a positive impression on the interviewer.

[p7] 📄 **Know Your Resume**: Be prepared to discuss your projects, experiences, and skills listed on your resume in detail. Reflect on your accomplishments, challenges overcome, and lessons learned from each experience. Make sure you have quantifiable points.

[p8] ⌚ **Arrive Early**: Make sure to connect early to the meeting to avoid/fix any technical difficulties. If the interview is in person, arrive at the location early to allow for any unexpected delays. Being on time allows you to compose yourself, review your notes, and mentally prepare for the interview.

[p9] 🍊 **Eat Something Beforehand**: Fueling your body with the right nutrients can contribute to a clear mind and increased confidence during the interview. Avoid heavy or greasy foods that could make you feel sluggish or uncomfortable during the interview.

[p10] ❓ **Prepare Questions**: Prepare thoughtful questions to ask the interviewer about the company, role, team dynamics, or future projects. Asking questions demonstrates your interest in the position and company.

[p11] 💪 **Stay Calm and Confident**: Remember to breathe and stay calm during the interview. Maintain good posture, try to avoid excessive fidgeting/moving around, make eye contact, and speak clearly and confidently. Try to smile!

[p12] 📩 **Follow-Up**: Send a thank-you email or handwritten note to the interviewer within 24 hours of the interview. Express your gratitude for the opportunity to interview and reiterate your interest in the position.
```

## mastering-the-behavioral-interview, lesson 170 (classic)

```
Droplet: Mastering the Behavioral Interview
Learning objectives:
- Understand the purpose and significance of behavioral interviews in the tech industry and what types of question are usually asked.
- Learn the STAR method for structuring responses to behavioral interview questions.
- Practice formulating responses to common behavioral interview questions related to technical and personal skills, personal and academic projects, leadership, teamwork, and problem-solving abilities.
- Develop effective storytelling techniques to showcase relevant experiences and accomplishments.
- Reflect on personal interview performance and identify areas for improvement in interview preparation strategies.
Lesson: Acing the ‘Communication Skills’ Question

[p1] Communication skills are extremely important in the professional world, influencing every aspect of daily interactions, from conveying ideas effectively to resolving conflicts diplomatically. In this section, we'll delve into mastering communication skills questions.

[p2] [Callout, info] These questions are designed to probe your ability to articulate ideas clearly, listen actively, empathize, persuade, and navigate challenging situations with finesse.

[p3] ### Question Examples and Best Practices

[p4] Let's start by exploring the types of questions you might encounter. Employers often pose different questions to assess your communication skills. Here are a few examples:

[p5] - "Can you describe a situation where you had to communicate complex information to a non-technical audience?"
- "Tell me about a time when you had to resolve a conflict through effective communication."
- "Describe a situation where you persuaded others through verbal and/or written communication."

[p6] [Callout, info] **Best Practices**
- Highlight relevant experiences by emphasizing situations where you successfully demonstrated communication skills and achieved positive outcomes.
- Stress the importance of effective communication by connecting each example to the broader impact of clear communication on project success and team dynamics.

[p7] *These questions are adapted from the* [*University of San Francisco’s Career Services*](https://myusf.usfca.edu/career-services/career-resources/interviews-offers/interviews/sample-behavioral-questions)*.*

[p8] ### Formulating Responses Using the STAR Method:

[p9] Now, let's delve into how to craft your responses using the STAR method:

[p10] - **Situation**: Set the stage by describing the context or scenario you encountered.
- **Task**: Explain the specific task or challenge you faced, emphasizing the communication aspect.
- **Action**: Detail the actions you took to address the situation, focusing on your communication strategies and techniques.
- **Result**: Conclude by discussing the outcomes or results of your actions, highlighting the positive impact of effective communication.

[p11] ### Sample Responses and Analysis

[p12] Let's explore sample responses to the behavioral interview question:

[p13] > "Can you describe a situation where you had to communicate complex information to a non-technical audience?”

[p14] **Good Example Response**:

[p15] *Candidate*: "In my previous role as a data analyst, I was tasked with presenting the findings of a comprehensive market research study to our company's creative team, most of whom had limited technical knowledge. To ensure clear understanding, I prepared a visually engaging presentation with simplified charts and graphs, accompanied by concise explanations of key data points. I avoided technical jargon and focused on communicating the key findings in a relatable manner. I stopped a couple of times throughout my presentation to see if the team had any questions, and I answered them promptly. As a result, the creative team not only grasped the complex data but also felt informed and empowered to make data-driven decisions for their part of the project."

[p16] **Bad Example Response:**

[p17] *Candidate*: "Well, I once had to present some data to a group of non-tech people in a school project. It was kinda hard because they kept asking me questions and I had to keep repeating the information, but I think they got it in the end. I thought everyone knew what SaaS meant, lol."

[p18] ### Check-In: Acing the ‘Communication Skills’ Question

[p19] [Quiz question] **Which of the following statements best describes the strengths of the "Good Example" response?**
  - The response is short and lacks specificity and detail, making it easy for the interviewer to assess the candidate's communication skills effectively.
  - The response focuses on the creative team and their difficulties, which showcases the candidate’s empathy towards them.
  - The candidate effectively demonstrates their ability to communicate complex information by breaking it down into digestible bits, using visual aids, and fostering an open dialogue.
  - The candidate does a good job of showcasing his technical knowledge, therefore impressing the interviewer.

[p20] [Quiz question] What is a key benefit of effective communication skills in the workplace?
  - Increased productivity
  - Enhanced team collaboration
  - Improved problem-solving
  - All of the above
```

Question 71: **Which of the following statements best describes the strengths of the "Good Example" response?**

- 204: The response is short and lacks specificity and detail, making it easy for the interviewer to assess the candidate's communication skills effectively.
- 205: The response focuses on the creative team and their difficulties, which showcases the candidate’s empathy towards them.
- 203: The candidate effectively demonstrates their ability to communicate complex information by breaking it down into digestible bits, using visual aids, and fostering an open dialogue. **(correct; for review only, never sent to the model)**
- 206: The candidate does a good job of showcasing his technical knowledge, therefore impressing the interviewer.

Question 72: What is a key benefit of effective communication skills in the workplace?

- 207: Increased productivity
- 210: Enhanced team collaboration
- 209: Improved problem-solving
- 208: All of the above **(correct; for review only, never sent to the model)**

## mastering-the-behavioral-interview, lesson 171 (classic)

```
Droplet: Mastering the Behavioral Interview
Learning objectives:
- Understand the purpose and significance of behavioral interviews in the tech industry and what types of question are usually asked.
- Learn the STAR method for structuring responses to behavioral interview questions.
- Practice formulating responses to common behavioral interview questions related to technical and personal skills, personal and academic projects, leadership, teamwork, and problem-solving abilities.
- Develop effective storytelling techniques to showcase relevant experiences and accomplishments.
- Reflect on personal interview performance and identify areas for improvement in interview preparation strategies.
Lesson: Acing the ‘Leadership and Teamwork’ Question

[p1] Leadership and teamwork skills are fundamental in the professional landscape, contributing to project success, team cohesion, and organizational growth. Next, we’ll explore how to excel in answering questions related to leadership and teamwork during your behavioral interview.

[p2] [Callout, info] These questions aim to assess your interpersonal and leadership skills. This may include your ability to lead, collaborate effectively, delegate tasks, resolve conflicts, and inspire others professionally and personally.

[p3] ### Question Examples and Best Practices

[p4] Let's start by exploring the types of questions you might encounter. Employers often pose different questions to assess your leadership and teamwork skills. Here are a few examples:

[p5] - "Tell me about a time when you took charge of a project and achieved successful results."
- “When working on a team, describe a time when one person was not doing their share of the work. What did you do?”
- "Describe a project where you had to collaborate with cross-functional teams. What was your role, and how did you ensure effective collaboration?"
- “How would you describe your collaboration styles? Do you prefer to work with a team or independently?”

[p6] [Callout, info] **Best Practices**
- Emphasize your ability to inspire and motivate others, resolve conflicts diplomatically, and foster a collaborative team environment.
- Highlight relevant experiences by emphasizing situations where you demonstrated effective leadership and teamwork skills and achieved positive outcomes.
- No matter your role, you will inevitably have to work in a team–interviewers want you to demonstrate your ability to work well with others. Make it clear that you work effectively with a team, but can still work as an individual when required.

[p7] *These questions are adapted from* [*PATHRISE*](https://myusf.usfca.edu/career-services/career-resources/interviews-offers/interviews/sample-behavioral-questions)*.*

[p8] ### Formulating Responses Using the STAR Method:

[p9] Let's review how to structure your responses using the STAR method:

[p10] - **Situation**: Provide context by describing the scenario or project you were involved in.
- **Task**: Explain the specific task or challenge you faced, emphasizing your leadership or teamwork role.
- **Action**: Detail the actions you took to address the situation, focusing on your leadership style or collaboration strategies.
- **Result**: Conclude by discussing the outcomes or results of your actions, highlighting the successful achievement of goals or positive impact on the team.

[p11] ### Sample Responses and Analysis

[p12] Let's explore sample responses to some of the leadership and teamwork interview question:

[p13] **Student Success Stories**

[p14] Insert Student sample responses (quick 2min videos max)

[p15] Student A

[Image: a.jpeg]

[p16] Student B

[Image: b.jpeg]

[p17] Student C

[Image: c.jpeg]

[p18] Student D

[Image: d.jpeg]

[p19] ### Check-In: Acing the ‘Leadership and Teamwork’ Question

[p20] [Quiz question] **How do you think student X could have improved his response to the question?**
  - They should have talked about what their teammates’ contribution to the project was.
  - They should have talked more about the conflict, recruiters LOVE drama!
  - They could’ve highlighted their skills in a more straightforward way by using the Action part of the STAR Method.
  - Nothing could be done since they used the STAR method effectively.
```

Question 42: **How do you think student X could have improved his response to the question?**

- 139: They should have talked about what their teammates’ contribution to the project was.
- 141: They should have talked more about the conflict, recruiters LOVE drama!
- 140: They could’ve highlighted their skills in a more straightforward way by using the Action part of the STAR Method. **(correct; for review only, never sent to the model)**
- 142: Nothing could be done since they used the STAR method effectively.

## mastering-the-behavioral-interview, lesson 172 (classic)

```
Droplet: Mastering the Behavioral Interview
Learning objectives:
- Understand the purpose and significance of behavioral interviews in the tech industry and what types of question are usually asked.
- Learn the STAR method for structuring responses to behavioral interview questions.
- Practice formulating responses to common behavioral interview questions related to technical and personal skills, personal and academic projects, leadership, teamwork, and problem-solving abilities.
- Develop effective storytelling techniques to showcase relevant experiences and accomplishments.
- Reflect on personal interview performance and identify areas for improvement in interview preparation strategies.
Lesson: Acing the ‘Problem Solving Abilities’ Question

[p1] Problem-solving abilities help you navigate the complexities of the professional world, enabling you to identify challenges, devise effective solutions, and adapt to changing circumstances. Let's explore how to excel in answering questions related to problem-solving abilities.

[p2] [Callout, info] These questions aim to assess your analytical skills, critical thinking, creativity, adaptability, and resilience in tackling various challenges.

[p3] ### Question Examples and Best Practices

[p4] Let's start by exploring the types of questions you might encounter. Employers often pose different questions to assess your communication skills. Here are a few examples:

[p5] - "Can you describe a time when you encountered a difficult problem at work or school? How did you approach it?"
- "Tell me about a project where you had to overcome unexpected obstacles. What were these and how did you adapt to the changes?"
- "Describe a situation where you had to make a difficult decision under pressure. How did you analyze the situation and come to a resolution?"
- “Tell me about a situation where you had to seek out relevant information, define key issues, and determine steps to get a desired result.”

[p6] [Callout, info] **Best Practices**
- Highlight relevant experiences by emphasizing situations where you effectively identified and resolved problems, demonstrated creativity and resourcefulness, and adapted to changing circumstances.
- Showcase your analytical thinking, decision-making process, and ability to remain calm and composed under pressure.
- You want to demonstrate confidence in your ability to handle stress, be quick and adaptable on your feet, and come through for the organization.

[p7] ### Formulating Responses Using the STAR Method:

[p8] Let's review how to structure your responses using the STAR method:

[p9] - **Situation**: Provide context by describing the scenario or project where you encountered a problem or obstacle.
- **Task**: Explain the specific task or challenge you faced, emphasizing the problem-solving aspect.
- **Action**: Detail the actions you took to address the situation, focusing on your problem-solving strategies and decision-making process.
- **Result**: Conclude by discussing the outcomes or results of your actions, highlighting the successful resolution of the problem or the lessons learned from the experience.

[p10] ### Sample Responses and Analysis

[p11] In this section, you will an ideal sample response by filling in the blanks below.

[p12] > "Can you describe a time when you encountered a difficult problem at work or school? How did you approach it?”

[p13] ### Check-In: Acing the ‘Problem Solving Abilities’ Question

[p14] [Quiz question] True or False: Employers use behavioral interviews to assess a candidate's past behaviors as predictors of future performance.
  - True
  - False
```

Question 43 (no hints): True or False: Employers use behavioral interviews to assess a candidate's past behaviors as predictors of future performance.

- 143: True **(correct; for review only, never sent to the model)**
- 144: False

## mastering-the-behavioral-interview, lesson 173 (classic)

```
Droplet: Mastering the Behavioral Interview
Learning objectives:
- Understand the purpose and significance of behavioral interviews in the tech industry and what types of question are usually asked.
- Learn the STAR method for structuring responses to behavioral interview questions.
- Practice formulating responses to common behavioral interview questions related to technical and personal skills, personal and academic projects, leadership, teamwork, and problem-solving abilities.
- Develop effective storytelling techniques to showcase relevant experiences and accomplishments.
- Reflect on personal interview performance and identify areas for improvement in interview preparation strategies.
Lesson: Acing the ‘Initiative and Personal Projects’ Question

[p1] Initiative and personal projects demonstrate your drive, ambition, and proactive nature, showcasing your ability to take initiative and drive positive change. Especially during interviews for tech roles, you might be asked about your personal and professional projects and how your initiative was a driving factor in accomplishing them. Let's dive into how to excel in answering questions related to initiative and personal projects.

[p2] [Callout, info] These questions aim to assess your motivation, self-direction, creativity, and ability to take ownership of projects or initiatives. They also serve to showcase your past projects and your experience putting your technical skills to good use.

[p3] ### Question Examples and Best Practices

[p4] Let's start by exploring the types of questions you might encounter. Employers often pose different questions to assess your communication skills. Here are a few examples:

[p5] - "Tell me about a project you have initiated. What influenced you to begin the project? "
- "Tell me about a personal project you pursued outside of your regular responsibilities. What motivated you to pursue it?"
- "Describe a situation where you identified an opportunity for improvement and took proactive steps to address it."
- “What is the most creative thing you have ever done?”

[p6] [Callout, info] **Best Practices**
- This is your time to shine! Showcase your motivation, creativity, drive, and ability to take ownership and drive positive change.
- Emphasize situations where you took the initiative to start a project, implement a new idea, or pursue personal interests.
- These questions are great to show your passion towards certain personal and professional interests and are a great way to let the interviewer know how you’ve gone above and beyond.

[p7] ### Formulating Responses Using the STAR Method:

[p8] Now, let's delve into how to craft your responses using the STAR method:

[p9] - **Situation**: Provide context by describing the scenario or opportunity where you took the initiative to start a project or pursue a personal endeavor.
- **Task**: Explain the specific task or challenge you identified, emphasizing the need for initiative and proactive action.
- **Action**: Detail the actions you took to address the situation, focusing on your initiative, creativity, and problem-solving abilities.
- **Result**: Conclude by discussing the outcomes or results of your actions, highlighting the impact of your initiative and personal projects.

[p10] ### Sample Responses and Analysis

[p11] Let's explore sample responses to the behavioral interview question:

[p12] > "Can you describe a time when you took the initiative to start a project or implement a new idea?”

[p13] **Student Success Stories**

[p14] Listen to these three students answer this question and talk about their personal projects.

[p15] Student A

[Image: aa.jpeg]

[p16] Student B

[Image: bb.jpeg]

[p17] Student C

[Image: cc.jpeg]

[p18] ## Conclusion and Next Steps

[p19] Congratulations on completing this module on mastering behavioral interviews! Let's recap the key takeaways and outline your next steps:

[p20] - **Preparation is Key**: Remember the importance of thorough preparation for behavioral interviews. Research the company, practice using the STAR method, and familiarize yourself with common interview questions.
- **Effective Storytelling**: Mastering the art of storytelling is crucial. Use the STAR method to structure your responses, providing clear and concise examples of your skills and experiences.
- **Practice, Practice, Practice**: Practice makes perfect! Take the time to practice answering behavioral interview questions, either by yourself or with a friend or mentor. The more you practice, the more confident and polished you'll become.
```

## solidworks-cad-basics, lesson 377 (blocknote)

```
Droplet: Solidworks/CAD Basics
Learning objectives:
- Navigate the SolidWorks interface and create fully defined 2D sketches
Lesson: Interface & Sketching

[p1] **Key Interface Elements:**

[p2] - **CommandManager (top toolbar):** Your main toolbox — changes based on what you're doing

[p3] - **FeatureManager Design Tree (left panel):** The history of every operation on your part. Click any item to edit it

[p4] - **Graphics Area (center):** Your 3D viewport

[p5] - **Mouse navigation:** Middle-click + drag to rotate, scroll to zoom, Ctrl + middle-click + drag to pan

[p6] **Sketching Basics:** Everything in SolidWorks starts with a 2D sketch. To begin: click Sketch → select a plane (Front, Top, or Right).

[p7] Essential tools: Line, Rectangle, Circle, Smart Dimension, Trim Entities

[p8] **Sketch Relations (Constraints):** Lock your geometry so it behaves predictably.

[p9] | Relation | What It Does |
| --- | --- |
| Coincident | Two points share the same location |
| Horizontal / Vertical | A line is perfectly H or V |
| Equal | Two lines/arcs share the same size |
| Midpoint | A point sits at the center of a line |

[p10] **Fully Defined Sketches — Critical:**

[p11] - 🔵 Blue = under-defined (still moves)

[p12] - ⚫ Black = fully defined ✓

[p13] - 🔴 Red = over-defined (fix this)

[p14] Always anchor your sketch to the origin and make all geometry black before exiting.

[Image, no alt text]

[p15] [Quiz question] What color is fully defined sketch geometry?
  - Black
  - Blue
  - Red
  - Yellow
```

Question 1704619557: What color is fully defined sketch geometry?

- 1900: Black **(correct; for review only, never sent to the model)**
- 1901: Blue
- 1902: Red
- 1903: Yellow

## technology-ethics-in-practice, lesson 144 (classic)

```
Droplet: Technology Ethics in Practice
Learning objectives:
- Understand the key ethical considerations and challenges arising from the rapid advancement of tech
- Be able to identify ethical dilemmas and evaluate the impact of technology on individuals and society
- Understand ethical and regulatory frameworks, guidelines, and practices to promote responsible and ethical practices in tech
Lesson: Technology Ethics Recap

[p1] ### **Definition of Ethics in Technology**

[p2] What are technology ethics? Technology ethics refers to the moral principles and guidelines that govern the development, use, and impact of technology on individuals, society, and the environment (Green, 2017). It encompasses a range of considerations, including privacy, security, fairness, transparency, and accountability in technological innovation and implementation.

[p3] **Tech** **ethics**, as we will call it, involves considering the impact of technological advancements on individuals, society, and the environment, and making decisions that prioritize ethical considerations alongside technological innovation.

[p4] In essence, technology ethics seeks to ensure that technology is developed and utilized in a manner that aligns with ethical principles and promotes the well-being of all stakeholders.
```

## technology-ethics-in-practice, lesson 145 (classic)

```
Droplet: Technology Ethics in Practice
Learning objectives:
- Understand the key ethical considerations and challenges arising from the rapid advancement of tech
- Be able to identify ethical dilemmas and evaluate the impact of technology on individuals and society
- Understand ethical and regulatory frameworks, guidelines, and practices to promote responsible and ethical practices in tech
Lesson: Regulatory Frameworks and Policies

[p1] The ethical considerations surrounding technology are often accompanied by legal regulations and frameworks designed to govern and mitigate potential risks and harms. Understanding these regulatory measures is essential for navigating the ethical complexities of technological development, deployment, and usage. In this section, we will explore key regulatory frameworks relevant to various aspects of technology ethics.

[p2] ### **GDPR (General Data Protection Regulation)**

[p3] The [GDPR](https://gdpr.eu/what-is-gdpr/), enacted by the European Union, represents one of the most comprehensive data privacy and protection regulations globally. It establishes stringent standards for the processing and handling of personal data, regardless of where the organization processing the data is located. The GDPR grants individuals greater control over their personal data, including the right to access, rectify, and erase their data. It also mandates transparency in data processing practices, requiring organizations to provide clear and concise information about how they collect, use, and share personal data.

[p4] For technological platforms and websites, non-compliance with the GDPR can result in hefty fines, underscoring the importance of adherence to its provisions.

[Video: https://www.youtube.com/embed/acijNEErf-c?si=GdbegXgk1Bo7APCs]

[p5] ### **CAN-SPAM Act**

[p6] The [CAN-SPAM Act](https://www.fcc.gov/general/can-spam#:~:text=Congress%20passed%20the%20CAN%2DSPAM,phones%E2%80%94not%20email%20in%20general), enacted in the United States, aims to regulate commercial email practices and combat the proliferation of unsolicited email spam. The act requires commercial email senders to include accurate header information and subject lines, provide recipients with a clear and conspicuous opt-out mechanism, and honor opt-out requests promptly. Additionally, the CAN-SPAM Act prohibits deceptive email practices, such as false or misleading subject lines and headers.

[p7] Compliance with the CAN-SPAM Act is essential for organizations engaged in email marketing to ensure ethical and lawful communication with consumers.

[p8] ### **CCPA (California Consumer Privacy Act)**

[p9] The [CCPA](https://oag.ca.gov/privacy/ccpa) represents a significant milestone in data privacy legislation in the United States. It grants California residents enhanced rights regarding the collection and use of their personal information by businesses operating in the state. Under the CCPA, individuals have the right to know what personal information is being collected about them, the right to access their data, the right to request deletion of their data, and the right to opt-out of the sale of their data. The CCPA also imposes obligations on businesses to provide transparent disclosures about their data practices and to implement reasonable security measures to protect consumer data.

[p10] Compliance with the CCPA is essential for organizations that handle the personal information of California residents to avoid penalties and maintain consumer trust.

[p11] ### **Section 230**

[p12] [Section 230](https://www.eff.org/issues/cda230) of the Communications Decency Act is a foundational legal provision that shields online platforms from liability for user-generated content. It grants online platforms immunity from liability for content posted by their users, with certain exceptions such as intellectual property violations and federal criminal law violations. Section 230 has played a pivotal role in fostering innovation and free expression on the internet by providing online platforms with legal protections against lawsuits arising from user-generated content. However, debates surrounding Section 230 have intensified in recent years, with calls for reform to address concerns related to online misinformation, hate speech, and platform accountability.

[p13] ### **COPPA (Children's Online Privacy Protection Act)**

[p14] [COPPA](https://www.ftc.gov/legal-library/browse/rules/childrens-online-privacy-protection-rule-coppa) is a federal law in the United States that aims to protect the online privacy of children under the age of 13. It imposes restrictions on the collection, use, and disclosure of personal information from children by operators of websites and online services directed at children. COPPA requires operators to obtain verifiable parental consent before collecting personal information from children, and it mandates the implementation of privacy policies outlining data collection practices.

[p15] Compliance with COPPA is essential for operators of websites and online services targeting children to ensure the protection of children's privacy rights and avoid regulatory penalties.

[p16] ### The Algorithm Accountability Act of 2023

[p17] The [Algorithmic Accountability Act of 2023](https://www.wyden.senate.gov/imo/media/doc/algorithmic_accountability_act_of_2023_summary.pdf), a proposed legislative framework, aims to address the ethical and societal implications of algorithmic decision-making by promoting transparency, fairness, and accountability in the development and deployment of algorithms. Through provisions such as requiring companies to conduct algorithmic impact assessments, enhance transparency, implement remediation measures for discriminatory outcomes, and establish regulatory oversight mechanisms, the Act seeks to mitigate potential biases and disparities in algorithmic systems. By fostering greater scrutiny and accountability of algorithmic decision-making, particularly in critical domains like employment and criminal justice, the Act aims to uphold ethical principles, protect civil rights, and promote fairness and justice in society.

[p18] [Quiz question] Which regulation grants individuals’ greater control over their personal data, including rights to access, rectify, and erase their data, regardless of the location of the organization processing the data?
  - CAN-SPAM Act
  - Section 230
  - GDPR
  - CCPA

[p19] [Quiz question] What does the Algorithmic Accountability Act of 2023 aim to address?
  - Protection of children's online privacy
  - Enhancing transparency, fairness, and accountability in algorithmic decision-making
  - Combatting email spam
  - Shielding online platforms from liability for user-generated content

[p20] [Quiz question] Which legislation requires operators of websites and online services targeting children to obtain verifiable parental consent before collecting personal information from children under the age of 13?
  - GDPR
  - CAN-SPAM Act
  - CCPA
  - COPPA
```

Question 31: Which regulation grants individuals’ greater control over their personal data, including rights to access, rectify, and erase their data, regardless of the location of the organization processing the data?

- 95: CAN-SPAM Act
- 97: Section 230
- 96: GDPR **(correct; for review only, never sent to the model)**
- 99: CCPA

Question 30: What does the Algorithmic Accountability Act of 2023 aim to address?

- 98: Protection of children's online privacy
- 100: Enhancing transparency, fairness, and accountability in algorithmic decision-making **(correct; for review only, never sent to the model)**
- 101: Combatting email spam
- 102: Shielding online platforms from liability for user-generated content

Question 32: Which legislation requires operators of websites and online services targeting children to obtain verifiable parental consent before collecting personal information from children under the age of 13?

- 103: GDPR
- 106: CAN-SPAM Act
- 104: CCPA
- 105: COPPA **(correct; for review only, never sent to the model)**

## technology-ethics-in-practice, lesson 146 (classic)

```
Droplet: Technology Ethics in Practice
Learning objectives:
- Understand the key ethical considerations and challenges arising from the rapid advancement of tech
- Be able to identify ethical dilemmas and evaluate the impact of technology on individuals and society
- Understand ethical and regulatory frameworks, guidelines, and practices to promote responsible and ethical practices in tech
Lesson: Ethical Issues in Technology

[p1] From data privacy and artificial intelligence to social media and algorithmic decision-making, various ethical issues arise, posing challenges that demand thoughtful reflection and responsible action. In this section, we will delve into some of the most pressing ethical issues in technology, examining their implications for individuals, society, and the digital ecosystem as a whole. We will also take a look at some of the regulatory frameworks that are currently in place to address some of the issues at hand.

[p2] ### Privacy and Data Protection

[p3] Privacy and data protection have become critical concerns in the digital age, as individuals increasingly rely on digital platforms and services that collect, store, and analyze vast amounts of personal information. The ubiquity of data collection raises significant ethical questions regarding individuals' privacy rights and autonomy.

[p4] [Callout, info] **Key Considerations:**
- The proliferation of data collection practices raises concerns about individuals' ability to control their personal information and maintain privacy in an increasingly interconnected world.
- Government surveillance programs and corporate data collection practices raise questions about the balance between national security interests and individual privacy rights.
- High-profile data breaches highlight the vulnerability of personal data stored by companies and organizations, underscoring the need for robust data protection measures and accountability mechanisms.

[p5] ### **AI and Bias**

[p6] Artificial intelligence (AI) technologies hold immense potential to revolutionize various industries and improve efficiency and productivity. However, AI algorithms are susceptible to biases, reflecting the partiality present in the data they are trained on and the decisions made by their developers. This raises ethical concerns regarding fairness, transparency, and accountability in AI systems.

[p7] [Callout, info] **Key Considerations:**
- Biases in training data and algorithmic decision-making processes can lead to discriminatory outcomes, perpetuating existing inequalities and reinforcing societal biases.
- The deployment of biased AI algorithms can have far-reaching ethical implications, particularly in domains such as hiring, lending, criminal justice, and healthcare, where algorithmic decisions impact individuals' opportunities, rights, and well-being.

[Video: https://www.youtube.com/embed/59bMh59JQDo?si=Rpf3CtyixgLqO2Ku]

[p8] ### **Algorithmic Accountability**

[p9] Algorithmic decision-making systems are increasingly used in various aspects of daily life, from credit scoring and job recruitment to predictive policing and content recommendation. However, the lack of transparency and accountability in these algorithms raises concerns about fairness, accountability, and the potential for harm.

[p10] [Callout, info] **Key Considerations:**
- Transparency and Accountability: The opacity of algorithmic decision-making processes makes it difficult to assess their fairness, accuracy, and potential biases, raising questions about accountability and responsibility.
- Impact of Biased Algorithms: Biased algorithms can perpetuate systemic inequalities and exacerbate social injustices, particularly when used in high-stakes decision-making contexts such as criminal justice or healthcare.

[p11] ### **Social Media and Digital Well-Being**

[p12] Social media platforms have transformed the way we communicate, connect, and share information, but they also raise significant ethical concerns related to mental health, privacy, and societal well-being. As integral parts of daily life for millions worldwide, understanding and addressing these concerns are paramount for fostering a healthy digital interpersonal ecosystem.

[p13] [Callout, info] **Key Considerations:**
- [Research](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10129173/) suggests a link between excessive social media use and mental health issues such as depression, anxiety, and loneliness, raising questions about the ethical responsibilities of platform developers and users (Zubair, Khan, & Albashari, 2023).
- Social media platforms collect vast amounts of personal data, raising concerns about individuals' privacy rights and the potential for misuse or exploitation of personal information.
- Social media platforms can amplify misinformation, polarize public discourse, and facilitate the spread of harmful content, posing challenges to democratic values, social cohesion, and collective well-being.

[Image: digital-wellbeing-tips.jpg]

[p14] ### Large Language Models (LLMs)

[p15] Large language models, such as OpenAI's GPT series or Google’s Gemini, have garnered widespread attention for their impressive capabilities in natural language understanding and generation. By processing vast amounts of text data, these models can produce contextually coherent and seemingly human-like responses to a wide range of prompts and queries.

[p16] However, the deployment of LLMs also presents a host of ethical considerations that demand careful scrutiny. These include their potential to perpetuate misinformation, amplify biases inherent in the data they are trained on, and be misused for harmful purposes.

[p17] [Callout, info] **Key Considerations:**
- Large language models can generate realistic-sounding text, very realistic video and images, and even voice recordings that may be indistinguishable from human-made content. This may raise concerns about the spread of misinformation versus disinformation.
- Biases present in training data can be amplified and perpetuated by large language models, leading to biased outputs that reflect and reinforce societal biases and stereotypes.
- Ensuring the ethical use of large language models encompasses a broad spectrum of considerations, ranging from user privacy and consent to broader societal impacts. Stakeholders must grapple with questions surrounding the responsible deployment of these models, including transparency in their application, accountability for their outputs, and mechanisms for safeguarding against misuse or unintended consequences.
```

## technology-ethics-in-practice, lesson 147 (classic)

```
Droplet: Technology Ethics in Practice
Learning objectives:
- Understand the key ethical considerations and challenges arising from the rapid advancement of tech
- Be able to identify ethical dilemmas and evaluate the impact of technology on individuals and society
- Understand ethical and regulatory frameworks, guidelines, and practices to promote responsible and ethical practices in tech
Lesson: Case Study: Cambridge Analytica Case

[p1] In this interactive case study, we'll explore the infamous Cambridge Analytica scandal, which shed light on the ethical implications of data misuse and manipulation in the digital age. Let's delve into the details and examine the ethical considerations surrounding this case.

[p2] ### **Background**

[p3] Cambridge Analytica, a British political consulting firm founded in 2013, gained notoriety for its strategic use of data analytics in political campaigns. The firm positioned itself as a pioneer in psychological profiling and micro-targeted advertising, claiming to have the capability to influence voter behavior through targeted messaging (Harbath & Fernekes, 2023).

[p4] One of Cambridge Analytica's most infamous projects involved the harvesting of personal data from millions of Facebook users without their explicit consent. This data was obtained through a third-party app which purported to be a personality quiz. However, the app not only collected data from its users but also extracted information from their Facebook friends, resulting in the unauthorized harvesting of vast amounts of personal data. Cambridge Analytica then used this data to build detailed psychographic profiles of individuals, categorizing them based on personality traits, political beliefs, and behavioral tendencies. For more info, read > [here](https://bipartisanpolicy.org/blog/cambridge-analytica-controversy/) <.

[Image: facebook-data-breach.webp]

[p5] During the 2016 US presidential election and the Brexit referendum, Cambridge Analytica employed these profiles to target voters with highly personalized political advertisements. By tailoring their messaging to resonate with the psychological profiles of individual voters, the firm aimed to influence their attitudes, preferences, and ultimately, their voting behavior.

[p6] The revelation of Cambridge Analytica's data harvesting practices sparked widespread outrage and led to investigations by regulatory authorities in both the United States and the United Kingdom. The scandal exposed the vulnerabilities of social media platforms like Facebook to exploitation by third-party developers and raised profound questions about the ethical implications of data-driven political campaigning.

[Image: Facebook-Analytica-1080x675.jpg]

[p7] Ultimately, the Cambridge Analytica scandal served as a wake-up call for policymakers, regulators, and tech companies, prompting calls for greater transparency, accountability, and data protection measures in the digital ecosystem. It underscored the need for robust regulatory frameworks to safeguard user privacy, protect democratic processes, and uphold ethical standards in the use of data for political purposes.

[p8] [Callout, info] ## **Key Points to Consider**
**Data Privacy Violations**:
- The unauthorized harvesting of personal data from millions of Facebook users without their explicit consent represents a significant violation of data privacy rights.
- The use of a third-party app to collect data not only from app users but also from their Facebook friends underscores the potential for widespread data exploitation and misuse in the digital ecosystem.
**Manipulation and Influence:**
- By tailoring political messaging to exploit individual vulnerabilities and preferences, the firm sought to influence voter attitudes and decision-making, highlighting the ethical implications of data-driven political campaigning.
**Regulatory Failures:**
- The Cambridge Analytica scandal exposed regulatory failures and loopholes in data protection laws, particularly regarding the collection and use of personal data by third-party developers.
- It highlighted the need for stricter enforcement of data protection regulations and greater transparency in data-sharing practices to prevent similar incidents of data misuse and abuse in the future.
**Platform Accountability:**
- The scandal raised questions about the accountability of social media platforms like Facebook in safeguarding user data and preventing unauthorized access by third-party developers, underscoring the importance of platform accountability and the need for robust data protection measures to protect user privacy and prevent data exploitation.
**User Empowerment and Awareness:**
- The incident underscored the importance of user empowerment and awareness in protecting personal data and privacy rights in the digital age.
- It emphasized the need for users to exercise caution and vigilance when sharing personal information online and for platforms to provide clear and transparent data privacy policies and controls.

[p9] [Quiz question] **What was the primary method used by Cambridge Analytica to obtain personal data from Facebook users?**
  - Users voluntarily provided their data through a survey conducted by Cambridge Analytica.
  - The firm partnered directly with Facebook to access user data.
  - Data was obtained through a third-party app that harvested information from users and their Facebook friends.
  - Cambridge Analytica conducted data breaches to obtain user information.

[p10] [Quiz question] **What type of profiles did Cambridge Analytica create using the harvested data?**
  - Demographic profiles based on age and location.
  - Psychographic profiles based on personality traits and behavioral tendencies.
  - Political profiles based on party affiliation and voting history.
  - Financial profiles based on income and spending habits.

[p11] [Quiz question] **What broader ethical considerations were raised by the Cambridge Analytica scandal?**
  - The importance of maximizing data collection without user consent.
  - The need for transparency and accountability in data-driven decision-making.
  - The benefits of exploiting individual vulnerabilities for political gain.
  - The necessity of manipulating public opinion without accountability.
```

Question 33: **What was the primary method used by Cambridge Analytica to obtain personal data from Facebook users?**

- 108: Users voluntarily provided their data through a survey conducted by Cambridge Analytica.
- 107: The firm partnered directly with Facebook to access user data.
- 110: Data was obtained through a third-party app that harvested information from users and their Facebook friends. **(correct; for review only, never sent to the model)**
- 109: Cambridge Analytica conducted data breaches to obtain user information.

Question 34: **What type of profiles did Cambridge Analytica create using the harvested data?**

- 111: Demographic profiles based on age and location.
- 112: Psychographic profiles based on personality traits and behavioral tendencies. **(correct; for review only, never sent to the model)**
- 114: Political profiles based on party affiliation and voting history.
- 113: Financial profiles based on income and spending habits.

Question 35: **What broader ethical considerations were raised by the Cambridge Analytica scandal?**

- 115: The importance of maximizing data collection without user consent.
- 116: The need for transparency and accountability in data-driven decision-making. **(correct; for review only, never sent to the model)**
- 118: The benefits of exploiting individual vulnerabilities for political gain.
- 117: The necessity of manipulating public opinion without accountability.

## technology-ethics-in-practice, lesson 148 (classic)

```
Droplet: Technology Ethics in Practice
Learning objectives:
- Understand the key ethical considerations and challenges arising from the rapid advancement of tech
- Be able to identify ethical dilemmas and evaluate the impact of technology on individuals and society
- Understand ethical and regulatory frameworks, guidelines, and practices to promote responsible and ethical practices in tech
Lesson: Ethics in Practice

[p1] In this final section, we explore the practical application of technology ethics, providing actionable insights and real-world examples to guide ethical decision-making in design, development, and everyday use.

[p2] ### **Ethical Design and Development**

[p3] *Principles of Ethical Design and Development:* We begin by outlining foundational principles that underpin ethical design and development.

[p4] - Privacy by Design: Integrating privacy protections into the design of products and services from the outset, rather than as an afterthought. For example, ensuring that user data is anonymized and encrypted by default.
- Accessibility and Inclusivity: Designing products and services to be accessible to users of all abilities and backgrounds. This may involve incorporating features such as screen reader compatibility and adjustable font sizes or ensuring that the products created are suitable to red/green colorblind users.
- Transparency and Accountability: Being transparent about how technology works and how user data is used and being accountable for the consequences of technological decisions. For instance, providing clear explanations of algorithmic decision-making processes.
- Bias Mitigation: Implementing measures to identify and mitigate biases in data and algorithms to ensure fair and equitable outcomes for all users. For example, regularly auditing machine learning models for biases and taking corrective actions as needed.

[p5] *Strategies for Integration:* We then explore practical strategies for integrating ethical considerations into the design process. These strategies may include:

[p6] - Engaging diverse stakeholders, including end-users, advocacy groups, and subject matter experts, throughout the design process to incorporate a variety of perspectives and identify potential ethical implications.
- Conducting ethical impact assessments to systematically evaluate the potential ethical risks and benefits of a technology product or feature. This may involve scenario planning exercises and stakeholder consultations to anticipate and address potential ethical dilemmas.
- Establishing mechanisms for ongoing ethical review and refinement throughout the development lifecycle. This may include regular ethics workshops, peer reviews, and ethical decision-making frameworks to guide ethical deliberations.

[p7] ### **Responsible Use of Technology**

[p8] *Guidelines for Responsible Use:* Next, we provide practical guidelines for responsible use of technology in personal and professional contexts. These guidelines may include:

[p9] - Informed Consent: Ensuring that users are informed about how their data will be collected, used, and shared, and obtaining their explicit consent before proceeding. For example, providing clear and understandable privacy policies and consent forms.
- Data Minimization: Collecting and retaining only the minimum amount of data necessary to achieve a specific purpose, and deleting data once it is no longer needed. This helps reduce the risk of data breaches and unauthorized access.
- User Empowerment: Empowering users to make informed choices about their technology use and providing them with tools and resources to manage their digital presence effectively. For instance, offering privacy-enhancing features such as ad blockers and privacy-focused search engines.

[p10] *Digital Literacy and Critical Thinking:* Finally, we emphasize the importance of digital literacy and critical thinking skills in navigating ethical dilemmas posed by technology. Participants are encouraged to:

[p11] - Evaluate Information: Develop the ability to critically evaluate information sources, discern credible sources from unreliable ones, and recognize misinformation and disinformation.
- Question Assumptions: Cultivate a habit of questioning assumptions, biases, and underlying motives in technology products and services, and consider the broader societal implications of technological decisions.

[p12] ### Industry Perspectives

[p13] Below are a couple of videos on different perspectives by current tech stakeholders and their approaches, opinions, and strategies to address some of the issues discussed in this Droplet.

[Video: https://www.youtube.com/embed/RoZ-WF5Z_1E?si=lNdWnbatVgnc0AQS]

[Video: https://www.youtube.com/embed/muLPOvIEtaw?si=OjM9BF9rOKZf9JBb]
```

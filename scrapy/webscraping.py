import re, json, time, requests, os
from selenium.webdriver import Chrome
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.by import By

token = "YOUR TOKEN HERE"

class PageLoaded(object):
    def __init__(self, oldId):
        self.oldId = oldId

    def __call__(self, browser):
        return self.oldId != browser.find_element_by_tag_name("html").id


def waitToLoad(browser, oldId):
    '''
    Wait the webpage load by tag_name.id
    '''
    try:
        wait = WebDriverWait(browser, 10)
        result = wait.until(PageLoaded(oldId))
        return True
    except Exception as e:
        print(e)
        return False

def versesTotal(abbrev, chapter, token):
    '''
    Return the total of verses of a chapter requesting bibleapi
    '''
    response = requests.get(
        f"https://bibleapi.co/api/verses/ra/{abbrev}/{str(chapter)}", 
        headers = {"Authorization": "Bearer " + token},
    )
    result = response.json()
    return result["chapter"]["verses"]

abbrev = input("Abbreviation: ")
browser = Chrome()
error = False

chapter = 1
totalChapters = requests.get(
        f"https://bibleapi.co/api/books/{abbrev}/", 
        headers = {"Authorization": "Bearer " + token},
    ).json()["chapters"]
book = {}

while chapter <= totalChapters and not error:
    print(f"Capturing the chapter {chapter}")
    # It enter in the chapter and wait to load

    oldId = browser.find_element_by_tag_name("html").id
    browser.get(f"https://pesquisa.biblia.com.br/pt-BR/RA/{abbrev}/{str(chapter)}")
    error = not waitToLoad(browser, oldId)
    
    if error:
        print("Script interruted")
        continue

    # It scroll to the end for load full page
    browser.execute_script("window.scrollBy(0, document.body.scrollHeight)")
    time.sleep(0.6)

    # It capture the verses
    total = versesTotal(abbrev, chapter, token)
    verses = browser.find_elements_by_css_selector("li[class=versiculoTexto]")
    while len(verses) != total:
        browser.execute_script("window.scrollBy(0, document.body.scrollHeight)")
        time.sleep(0.6)
        verses = browser.find_elements_by_css_selector("li[class=versiculoTexto]")

    # It create a new dictionary of the chapter
    book[chapter] = []
    for verse in verses:
        # It split the verse number of the verse text
        verse_number, verse_text = [x for x in re.split(r'(\d+)\s+([\w\W]*)', verse.text) if x != ""]
        book[chapter].append(verse_text.strip())

    chapter += 1

browser.quit()

if not error:
    print("Creating File")
    with open(os.path.join("chapters", f"{abbrev}.json"), "w", encoding="utf-8") as file:
        json.dump(book, file, ensure_ascii=False, indent = 2)

    # Add the chapters number in the books.json
    with open("books.json") as file:
        books = json.load(file)
    with open("books.json", "w") as file:
        books.update({abbrev: totalChapters})
        json.dump(books, file, indent = 2)
    print("Files created!")

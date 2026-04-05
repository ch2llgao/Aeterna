with open("src/App.tsx", "r", encoding="utf-8") as f:
    text = f.read()

text = text.replace("""    } catch (e: any) {
      showToast("Error: " + (e.reason || e.shortMessage || "Transaction failed"), "error");
    }""", """    } catch (e: any) {
      console.error(e);
      showToast("Error: " + (e.reason || e.shortMessage || e.message || "Transaction failed"), "error");
    }""")

with open("src/App.tsx", "w", encoding="utf-8") as f:
    f.write(text)

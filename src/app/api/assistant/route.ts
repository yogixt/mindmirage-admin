import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { mindMirageDb } from "@/lib/db";
import { z } from "zod";

export const runtime = "nodejs";

const Body = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string().min(1).max(4000),
    })
  ).min(1).max(100),
});

const SYSTEM_PROMPT = `You are the Kutir AI Assistant, an advanced AI co-pilot in the Mind Mirage Admin Panel.
You help the ashram admin team inspect, analyze, summarize, and understand database tables including bookings, orders, sadhaks, assignments, and logs.

DATABASE SCHEMA:
- bookings(id INTEGER PRIMARY KEY, name TEXT, email TEXT, whatsapp TEXT, subject TEXT, slot TEXT, preferred_dates TEXT, message TEXT, status TEXT, created_at TEXT, user_id TEXT, approved_date TEXT, paid INTEGER)
- orders(id INTEGER PRIMARY KEY, payment_id TEXT UNIQUE, order_id TEXT, user_id TEXT, user_name TEXT, email TEXT, items TEXT, amount_inr INTEGER, coupon TEXT, created_at TEXT)
- users(id TEXT PRIMARY KEY, email TEXT UNIQUE, name TEXT, image TEXT, enrolled_programs TEXT, city TEXT, preferred_path TEXT, why_i_seek TEXT, created_at TEXT, phone TEXT)
- sadhak_profiles(user_id TEXT PRIMARY KEY, bio TEXT, intention TEXT, avatar TEXT, cover TEXT, updated_at TEXT)
- assignment_submissions(id INTEGER PRIMARY KEY, user_id TEXT, user_name TEXT, course_slug TEXT, lesson INTEGER, image TEXT, status TEXT, submitted_at TEXT, reviewed_at TEXT, marks INTEGER, remarks TEXT)
- class_schedule(id INTEGER PRIMARY KEY, course_slug TEXT, on_date TEXT, at_time TEXT, zoom_url TEXT, note TEXT, created_at TEXT)
- blocked_dates(date TEXT PRIMARY KEY)
- coupons(code TEXT PRIMARY KEY, percent INTEGER, active INTEGER, created_at TEXT)
- form_entries(id INTEGER PRIMARY KEY, kind TEXT, name TEXT, email TEXT, whatsapp TEXT, payload TEXT, status TEXT, reply TEXT, replied_at TEXT, created_at TEXT)
- payment_events(id INTEGER PRIMARY KEY, status TEXT, payment_id TEXT, order_id TEXT, user_name TEXT, email TEXT, reason TEXT, created_at TEXT)
- admin_logins(id INTEGER PRIMARY KEY, email TEXT, ok INTEGER, ip TEXT, user_agent TEXT, created_at TEXT)

GUIDELINES:
- When asked about consultation logs, bookings, details, calendars, payments, sadhaks, or assignments, ALWAYS execute a read-only SELECT query first using "run_sql_query".
- Do not make assumptions. Look at the database.
- Keep SQL queries standard SQLite syntax. Compare dates using YYYY-MM-DD strings (e.g. date('now') or date('now', '-7 days')).
- For string matching in SQLite, use LIKE (e.g. email LIKE '%bijoy%').
- Present the results to the admin using beautiful, structured Markdown tables or lists.
- If you find no records, state that clearly.
- Keep answers professional, clear, and direct.`;

export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ ok: false, error: "team_only" }, { status: 403 });
  }

  let body;
  try {
    body = Body.parse(await req.json());
  } catch (e) {
    return NextResponse.json({ ok: false, error: "invalid_request" }, { status: 400 });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ ok: false, error: "groq_not_configured" }, { status: 503 });
  }

  try {
    let currentMessages: any[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...body.messages,
    ];

    let attempts = 0;
    let finalReply = "";

    while (attempts < 5) {
      attempts++;
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: currentMessages,
          temperature: 0,
          tools: [
            {
              type: "function",
              function: {
                name: "run_sql_query",
                description: "Run a read-only SQLite SELECT query against the database.",
                parameters: {
                  type: "object",
                  properties: {
                    sql: {
                      type: "string",
                      description: "The SQL SELECT statement. Must be read-only SELECT query.",
                    },
                  },
                  required: ["sql"],
                },
              },
            },
          ],
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error("[assistant] Groq API error:", errText);
        throw new Error(`Groq API returned HTTP ${res.status}: ${errText}`);
      }

      const json = await res.json();
      const choice = json.choices[0];
      const message = choice.message;

      if (message.tool_calls && message.tool_calls.length > 0) {
        currentMessages.push({
          role: "assistant",
          content: message.content || "",
          tool_calls: message.tool_calls,
        });

        for (const toolCall of message.tool_calls) {
          if (toolCall.function.name === "run_sql_query") {
            const args = JSON.parse(toolCall.function.arguments);
            let resultText = "";
            try {
              const sql = args.sql;
              const blockedPattern = /\b(insert|update|delete|drop|alter|create|replace)\b/i;
              const hasSelect = /\bselect\b/i.test(sql);
              if (blockedPattern.test(sql) || !hasSelect) {
                resultText = JSON.stringify({ error: "Only read-only SELECT queries are allowed." });
              } else {
                const db = mindMirageDb();
                if (!db) {
                  resultText = JSON.stringify({ error: "Database not connected" });
                } else {
                  const queryRes = await db.execute(sql);
                  resultText = JSON.stringify({ rows: queryRes.rows });
                }
              }
            } catch (err) {
              resultText = JSON.stringify({ error: err instanceof Error ? err.message : String(err) });
            }

            currentMessages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              name: "run_sql_query",
              content: resultText,
            });
          }
        }
      } else {
        finalReply = message.content || "";
        break;
      }
    }


    if (!finalReply) {
      finalReply = "I was unable to retrieve a response from the model. Please check the logs.";
    }

    return NextResponse.json({ ok: true, content: finalReply });
  } catch (err) {
    console.error("[assistant] error", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
